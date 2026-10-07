import crypto from 'crypto';
import { eq, sql, and, isNull, desc } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/index.ts';
import { inventoryLedger, products } from '../../db/schema.ts';
import { logAuditEvent } from '../../server/services/auditService.ts';

export type LedgerActionType =
  | 'PURCHASE_RECEIPT'
  | 'PRODUCTION_CONSUMPTION'
  | 'PRODUCTION_OUTPUT'
  | 'SALES_DISPATCH'
  | 'ADJUSTMENT_INCREASE'
  | 'ADJUSTMENT_DECREASE'
  | 'REVERSAL';

export interface PostLedgerParams {
  transactionDate: string; // YYYY-MM-DD
  productId: string;
  action: LedgerActionType;
  quantityChange: number; // positive or negative
  referenceEntity?: string;
  referenceId?: string;
  reason: string;
  createdBy?: string;
  tx?: any; // optional outer transaction
}

/**
 * Posts an immutable ledger entry. Historical records are NEVER updated or deleted.
 */
export async function postLedgerEntry(params: PostLedgerParams) {
  const {
    transactionDate,
    productId,
    action,
    quantityChange,
    referenceEntity,
    referenceId,
    reason,
    createdBy,
    tx,
  } = params;

  const dbClient = tx || (await getDb());
  const ledgerId = crypto.randomUUID();

  await dbClient.insert(inventoryLedger).values({
    id: ledgerId,
    transactionDate,
    productId,
    action,
    quantityChange: quantityChange.toFixed(3),
    referenceEntity: referenceEntity || null,
    referenceId: referenceId || null,
    reason,
    createdBy: createdBy || null,
  });

  return ledgerId;
}

/**
 * Reverses a previous ledger transaction by creating an opposite offsetting REVERSAL entry,
 * preserving complete audit history and preventing record deletion.
 */
export async function reverseLedgerEntry(options: {
  originalLedgerId: string;
  reason: string;
  userId?: string;
  userPhone?: string;
  requestId?: string;
  tx?: any;
}) {
  const { originalLedgerId, reason, userId, userPhone, requestId, tx } = options;

  const execute = async (client: any) => {
    const existing = await client
      .select()
      .from(inventoryLedger)
      .where(eq(inventoryLedger.id, originalLedgerId));

    if (!existing[0]) {
      throw new Error(`سند انبار با شناسه ${originalLedgerId} یافت نشد.`);
    }

    const orig = existing[0];
    const originalQty = parseFloat(orig.quantityChange);
    const reversalQty = -originalQty;
    const reversalId = crypto.randomUUID();
    const today = new Date().toISOString().slice(0, 10);

    await client.insert(inventoryLedger).values({
      id: reversalId,
      transactionDate: today,
      productId: orig.productId,
      action: 'REVERSAL',
      quantityChange: reversalQty.toFixed(3),
      referenceEntity: 'inventory_ledger',
      referenceId: originalLedgerId,
      reason: `ابطال تراکنش شماره ${originalLedgerId}: ${reason}`,
      createdBy: userId || null,
    });

    await logAuditEvent({
      userId,
      userPhone,
      action: 'REVERSE_INVENTORY_TRANSACTION',
      entityType: 'inventory_ledger',
      entityId: reversalId,
      oldState: orig,
      newState: { reversalId, reversedQty: reversalQty, reason },
      requestId,
    });

    return { reversalId, reversedQty: reversalQty };
  };

  if (tx) {
    return execute(tx);
  }
  return withTransaction(execute);
}

/**
 * Calculates real-time stock balance for a product from the immutable ledger.
 */
export async function getProductStockBalance(productId: string): Promise<number> {
  const db = await getDb();
  const res = await db
    .select({
      balance: sql<string>`coalesce(sum(cast(${inventoryLedger.quantityChange} as numeric)), 0)`,
    })
    .from(inventoryLedger)
    .where(eq(inventoryLedger.productId, productId));

  return parseFloat(res[0]?.balance || '0');
}

/**
 * Returns all active products with calculated current ledger balances and low stock alert flags.
 */
export async function getAllStockBalances() {
  const db = await getDb();
  const allProducts = await db
    .select()
    .from(products)
    .where(isNull(products.deletedAt))
    .orderBy(products.type, products.name);

  const ledgerTotals = await db
    .select({
      productId: inventoryLedger.productId,
      totalStock: sql<string>`coalesce(sum(cast(${inventoryLedger.quantityChange} as numeric)), 0)`,
    })
    .from(inventoryLedger)
    .groupBy(inventoryLedger.productId);

  const stockMap = new Map<string, number>();
  ledgerTotals.forEach((lt) => {
    stockMap.set(lt.productId, parseFloat(lt.totalStock) || 0);
  });

  return allProducts.map((p) => {
    const currentStockKg = stockMap.get(p.id) || 0;
    const minAlert = parseFloat(p.minStockAlert || '0');
    return {
      ...p,
      currentStockKg,
      isLowStock: minAlert > 0 && currentStockKg <= minAlert,
    };
  });
}

/**
 * Performs stock reconciliation (انبارگردانی فیزیکی)
 * Calculates the exact delta between physical count and current ledger balance,
 * and posts an atomic adjustment entry.
 */
export async function reconcileStock(params: {
  productId: string;
  physicalCountKg: number;
  reason: string;
  userId?: string;
  userPhone?: string;
  requestId?: string;
}) {
  const { productId, physicalCountKg, reason, userId, userPhone, requestId } = params;

  return withTransaction(async (tx) => {
    const currentBalance = await getProductStockBalance(productId);
    const difference = physicalCountKg - currentBalance;

    if (Math.abs(difference) < 0.001) {
      return { adjusted: false, difference: 0, message: 'موجودی فیزیکی با موجودی کاردکس دقیقاً برابر است.' };
    }

    const action: LedgerActionType = difference > 0 ? 'ADJUSTMENT_INCREASE' : 'ADJUSTMENT_DECREASE';
    const today = new Date().toISOString().slice(0, 10);

    const ledgerId = await postLedgerEntry({
      transactionDate: today,
      productId,
      action,
      quantityChange: difference,
      referenceEntity: 'reconciliation',
      reason: `انبارگردانی فیزیکی: موجودی قبلی ${currentBalance} kg، موجودی شمارش‌شده ${physicalCountKg} kg. دلیل: ${reason}`,
      createdBy: userId,
      tx,
    });

    await logAuditEvent({
      userId,
      userPhone,
      action: 'STOCK_RECONCILIATION',
      entityType: 'inventory_ledger',
      entityId: ledgerId,
      oldState: { currentBalance },
      newState: { physicalCountKg, difference, reason },
      requestId,
    });

    return {
      adjusted: true,
      ledgerId,
      previousBalance: currentBalance,
      newBalance: physicalCountKg,
      difference,
    };
  });
}
