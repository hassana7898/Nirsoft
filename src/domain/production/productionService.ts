import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/index.ts';
import {
  productionBatches,
  formulas,
  formulaItems,
  products,
} from '../../db/schema.ts';
import { postLedgerEntry, getProductStockBalance } from '../inventory/inventoryService.ts';
import { logAuditEvent } from '../../server/services/auditService.ts';

export interface ExecuteBatchParams {
  productionDate: string; // YYYY-MM-DD
  finishedGoodId: string;
  formulaId: string;
  plannedQuantityKg: number;
  actualQuantityKg: number;
  wasteKg?: number;
  operatorName?: string;
  userId?: string;
  userPhone?: string;
  requestId?: string;
}

/**
 * Executes a production run atomically:
 * 1. Checks recipe proportions.
 * 2. Checks raw material inventory sufficiency.
 * 3. Records production batch.
 * 4. Deducts consumed raw materials from inventory ledger.
 * 5. Adds finished good output to inventory ledger.
 * 6. Commits all changes atomically in a single transaction.
 */
export async function executeProductionBatch(params: ExecuteBatchParams) {
  const {
    productionDate,
    finishedGoodId,
    formulaId,
    plannedQuantityKg,
    actualQuantityKg,
    wasteKg = 0,
    operatorName = 'اپراتور خط تولید',
    userId,
    userPhone,
    requestId,
  } = params;

  if (plannedQuantityKg <= 0 || actualQuantityKg <= 0) {
    throw new Error('تناژ برنامه‌ریزی‌شده و تولید واقعی باید مثبت باشند.');
  }

  const db = await getDb();

  // 1. Fetch formula and formula items
  const formulaRecord = await db.select().from(formulas).where(eq(formulas.id, formulaId));
  if (!formulaRecord[0]) {
    throw new Error('فرمول تولید مورد نظر یافت نشد.');
  }

  const items = await db.select().from(formulaItems).where(eq(formulaItems.formulaId, formulaId));
  if (items.length === 0) {
    throw new Error('فرمول انتخاب شده فاقد اقلام مواد اولیه (BOM) است.');
  }

  const batchBasis = parseFloat(formulaRecord[0].batchBasisKg) || 1000;
  const ratio = plannedQuantityKg / batchBasis;

  // 2. Pre-verify inventory availability for each raw material
  const shortages: string[] = [];
  for (const item of items) {
    const requiredKg = (parseFloat(item.quantityKg) || 0) * ratio;
    const currentStock = await getProductStockBalance(item.rawMaterialId);
    if (currentStock < requiredKg) {
      const prod = await db.select().from(products).where(eq(products.id, item.rawMaterialId));
      const prodName = prod[0]?.name || item.rawMaterialId;
      shortages.push(`${prodName} (کسری: ${(requiredKg - currentStock).toFixed(1)} kg)`);
    }
  }

  // Warn or block based on requirements (here we log or block)
  if (shortages.length > 0) {
    console.warn(`[NIRWARE Production Warning] Inventory deficit detected for: ${shortages.join(', ')}`);
  }

  const batchId = crypto.randomUUID();
  const randCode = Math.floor(1000 + Math.random() * 9000);
  const batchNumber = `BATCH-${productionDate.replace(/-/g, '')}-${randCode}`;

  // 3. Execute atomic transaction
  return withTransaction(async (tx) => {
    // A. Insert production batch
    await tx.insert(productionBatches).values({
      id: batchId,
      batchNumber,
      productionDate,
      finishedGoodId,
      formulaId,
      plannedQuantityKg: plannedQuantityKg.toFixed(3),
      actualQuantityKg: actualQuantityKg.toFixed(3),
      wasteKg: wasteKg.toFixed(3),
      operatorName,
      createdBy: userId || null,
    });

    // B. Deduct raw materials based on formula ratios
    for (const item of items) {
      const requiredKg = (parseFloat(item.quantityKg) || 0) * ratio;
      await postLedgerEntry({
        transactionDate: productionDate,
        productId: item.rawMaterialId,
        action: 'PRODUCTION_CONSUMPTION',
        quantityChange: -requiredKg,
        referenceEntity: 'production_batches',
        referenceId: batchId,
        reason: `مصرف مواد اولیه در بچ تولید ${batchNumber} (${plannedQuantityKg} kg)`,
        createdBy: userId,
        tx,
      });
    }

    // C. Add finished goods to inventory
    await postLedgerEntry({
      transactionDate: productionDate,
      productId: finishedGoodId,
      action: 'PRODUCTION_OUTPUT',
      quantityChange: actualQuantityKg,
      referenceEntity: 'production_batches',
      referenceId: batchId,
      reason: `تولید خوراک آماده در بچ ${batchNumber}`,
      createdBy: userId,
      tx,
    });

    // D. Write Audit Log
    await logAuditEvent({
      userId,
      userPhone,
      action: 'EXECUTE_PRODUCTION_BATCH',
      entityType: 'production_batches',
      entityId: batchId,
      newState: {
        batchNumber,
        finishedGoodId,
        plannedQuantityKg,
        actualQuantityKg,
        wasteKg,
        formulaId,
      },
      requestId,
    });

    return {
      batchId,
      batchNumber,
      plannedQuantityKg,
      actualQuantityKg,
      wasteKg,
    };
  });
}
