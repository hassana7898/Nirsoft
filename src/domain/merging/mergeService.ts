import { eq } from 'drizzle-orm';
import { getDb, withTransaction } from '../../db/index.ts';
import {
  farmers,
  farms,
  flocks,
  feedOrders,
  outboundExits,
  drivers,
  vehicles,
  deliveries,
  inboundEntries,
  products,
  formulaItems,
  inventoryLedger,
} from '../../db/schema.ts';
import { logAuditEvent } from '../../server/services/auditService.ts';

/**
 * Merges two duplicate farmers safely inside an atomic transaction.
 * All historical farms, flocks, orders and exit tickets are migrated to targetFarmerId.
 */
export async function mergeFarmers(params: {
  sourceFarmerId: string;
  targetFarmerId: string;
  userId?: string;
  userPhone?: string;
  requestId?: string;
}) {
  const { sourceFarmerId, targetFarmerId, userId, userPhone, requestId } = params;

  if (sourceFarmerId === targetFarmerId) {
    throw new Error('مرغدار مبدأ و مقصد نمی‌توانند یکسان باشند.');
  }

  return withTransaction(async (tx) => {
    // 1. Verify both exist
    const src = await tx.select().from(farmers).where(eq(farmers.id, sourceFarmerId));
    const tgt = await tx.select().from(farmers).where(eq(farmers.id, targetFarmerId));

    if (!src[0] || !tgt[0]) {
      throw new Error('مرغدار مبدأ یا مقصد در پایگاه داده یافت نشد.');
    }

    // 2. Re-assign related entities
    await tx.update(farms).set({ farmerId: targetFarmerId }).where(eq(farms.farmerId, sourceFarmerId));
    await tx.update(flocks).set({ farmerId: targetFarmerId }).where(eq(flocks.farmerId, sourceFarmerId));
    await tx.update(feedOrders).set({ farmerId: targetFarmerId }).where(eq(feedOrders.farmerId, sourceFarmerId));
    await tx.update(outboundExits).set({ farmerId: targetFarmerId }).where(eq(outboundExits.farmerId, sourceFarmerId));

    // 3. Mark source farmer as soft-deleted and note merged
    await tx
      .update(farmers)
      .set({
        deletedAt: new Date(),
        fullName: `${src[0].fullName} (ادغام‌شده در ${tgt[0].fullName})`,
      })
      .where(eq(farmers.id, sourceFarmerId));

    await logAuditEvent({
      userId,
      userPhone,
      action: 'MERGE_FARMERS',
      entityType: 'farmers',
      entityId: targetFarmerId,
      oldState: { sourceFarmerId, sourceName: src[0].fullName },
      newState: { targetFarmerId, targetName: tgt[0].fullName },
      requestId,
    });

    return {
      success: true,
      mergedSourceId: sourceFarmerId,
      targetId: targetFarmerId,
    };
  });
}

/**
 * Merges two duplicate drivers safely inside an atomic transaction.
 */
export async function mergeDrivers(params: {
  sourceDriverId: string;
  targetDriverId: string;
  userId?: string;
  userPhone?: string;
  requestId?: string;
}) {
  const { sourceDriverId, targetDriverId, userId, userPhone, requestId } = params;

  if (sourceDriverId === targetDriverId) {
    throw new Error('راننده مبدأ و مقصد نمی‌توانند یکسان باشند.');
  }

  return withTransaction(async (tx) => {
    const src = await tx.select().from(drivers).where(eq(drivers.id, sourceDriverId));
    const tgt = await tx.select().from(drivers).where(eq(drivers.id, targetDriverId));

    if (!src[0] || !tgt[0]) {
      throw new Error('راننده مبدأ یا مقصد در پایگاه داده یافت نشد.');
    }

    await tx.update(vehicles).set({ driverId: targetDriverId }).where(eq(vehicles.driverId, sourceDriverId));
    await tx.update(deliveries).set({ driverId: targetDriverId }).where(eq(deliveries.driverId, sourceDriverId));
    await tx.update(inboundEntries).set({ driverId: targetDriverId }).where(eq(inboundEntries.driverId, sourceDriverId));
    await tx.update(outboundExits).set({ driverId: targetDriverId }).where(eq(outboundExits.driverId, sourceDriverId));

    await tx
      .update(drivers)
      .set({
        isActive: false,
        fullName: `${src[0].fullName} (ادغام‌شده در ${tgt[0].fullName})`,
      })
      .where(eq(drivers.id, sourceDriverId));

    await logAuditEvent({
      userId,
      userPhone,
      action: 'MERGE_DRIVERS',
      entityType: 'drivers',
      entityId: targetDriverId,
      oldState: { sourceDriverId, sourceName: src[0].fullName },
      newState: { targetDriverId, targetName: tgt[0].fullName },
      requestId,
    });

    return {
      success: true,
      mergedSourceId: sourceDriverId,
      targetId: targetDriverId,
    };
  });
}

/**
 * Merges two duplicate products safely inside an atomic transaction.
 */
export async function mergeProducts(params: {
  sourceProductId: string;
  targetProductId: string;
  userId?: string;
  userPhone?: string;
  requestId?: string;
}) {
  const { sourceProductId, targetProductId, userId, userPhone, requestId } = params;

  if (sourceProductId === targetProductId) {
    throw new Error('کالای مبدأ و مقصد نمی‌توانند یکسان باشند.');
  }

  return withTransaction(async (tx) => {
    const src = await tx.select().from(products).where(eq(products.id, sourceProductId));
    const tgt = await tx.select().from(products).where(eq(products.id, targetProductId));

    if (!src[0] || !tgt[0]) {
      throw new Error('کالای مبدأ یا مقصد در پایگاه داده یافت نشد.');
    }

    await tx.update(inventoryLedger).set({ productId: targetProductId }).where(eq(inventoryLedger.productId, sourceProductId));
    await tx.update(inboundEntries).set({ productId: targetProductId }).where(eq(inboundEntries.productId, sourceProductId));
    await tx.update(outboundExits).set({ productId: targetProductId }).where(eq(outboundExits.productId, sourceProductId));
    await tx.update(formulaItems).set({ rawMaterialId: targetProductId }).where(eq(formulaItems.rawMaterialId, sourceProductId));

    await tx
      .update(products)
      .set({
        deletedAt: new Date(),
        name: `${src[0].name} (ادغام‌شده در ${tgt[0].name})`,
      })
      .where(eq(products.id, sourceProductId));

    await logAuditEvent({
      userId,
      userPhone,
      action: 'MERGE_PRODUCTS',
      entityType: 'products',
      entityId: targetProductId,
      oldState: { sourceProductId, sourceName: src[0].name },
      newState: { targetProductId, targetName: tgt[0].name },
      requestId,
    });

    return {
      success: true,
      mergedSourceId: sourceProductId,
      targetId: targetProductId,
    };
  });
}
