import { Router } from 'express';
import { eq, desc, isNull, sql } from 'drizzle-orm';
import { getDb } from '../../db/index.ts';
import {
  flocks,
  farmers,
  outboundExits,
  inboundEntries,
  inventoryLedger,
  products,
} from '../../db/schema.ts';
import { requireAuth } from '../middleware/auth.ts';
import { calculateFCR, calculatePerCapita } from '../../domain/farming/calculations.ts';

const router = Router();

// GET /api/v1/reports/overview
router.get('/overview', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();

    // 1. Active flocks and total chick count
    const activeFlocks = await db
      .select()
      .from(flocks)
      .where(eq(flocks.status, 'ACTIVE'));

    const totalActiveChicks = activeFlocks.reduce((sum, f) => sum + (f.chickCount || 0), 0);

    // 2. Total feed delivered to date
    const feedExits = await db
      .select({
        totalKg: sql<string>`coalesce(sum(cast(${outboundExits.weight} as numeric)), 0)`,
      })
      .from(outboundExits)
      .where(isNull(outboundExits.deletedAt));

    const totalFeedDeliveredKg = parseFloat(feedExits[0]?.totalKg || '0');

    // 3. Raw materials intake & wastage
    const inbounds = await db
      .select({
        totalBill: sql<string>`coalesce(sum(cast(${inboundEntries.billWeight} as numeric)), 0)`,
        totalScale: sql<string>`coalesce(sum(cast(${inboundEntries.scaleWeight} as numeric)), 0)`,
        totalWastage: sql<string>`coalesce(sum(cast(${inboundEntries.wastage} as numeric)), 0)`,
      })
      .from(inboundEntries)
      .where(isNull(inboundEntries.deletedAt));

    const totalBillKg = parseFloat(inbounds[0]?.totalBill || '0');
    const totalScaleKg = parseFloat(inbounds[0]?.totalScale || '0');
    const totalWastageKg = parseFloat(inbounds[0]?.totalWastage || '0');

    // 4. Current inventory stock sum
    const ledgerStock = await db
      .select({
        totalStock: sql<string>`coalesce(sum(cast(${inventoryLedger.quantityChange} as numeric)), 0)`,
      })
      .from(inventoryLedger);

    const totalCurrentStockKg = parseFloat(ledgerStock[0]?.totalStock || '0');

    // 5. Total registered farmers
    const allFarmers = await db.select().from(farmers).where(isNull(farmers.deletedAt));

    res.json({
      success: true,
      data: {
        activeFlocksCount: activeFlocks.length,
        totalActiveChicks,
        totalFeedDeliveredKg,
        totalRawMaterialsIntakeKg: totalScaleKg,
        totalWastageKg,
        wastagePercentage: totalBillKg > 0 ? ((totalWastageKg / totalBillKg) * 100).toFixed(2) : '0.00',
        totalCurrentStockKg,
        totalFarmersCount: allFarmers.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reports/fcr-analysis
router.get('/fcr-analysis', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const allFlocks = await db
      .select({
        id: flocks.id,
        flockCode: flocks.flockCode,
        breed: flocks.breed,
        chickCount: flocks.chickCount,
        startDate: flocks.startDate,
        status: flocks.status,
        finalChickenWeight: flocks.finalChickenWeight,
        farmerId: flocks.farmerId,
        farmerName: farmers.fullName,
      })
      .from(flocks)
      .leftJoin(farmers, eq(flocks.farmerId, farmers.id))
      .where(isNull(flocks.deletedAt))
      .orderBy(desc(flocks.startDate));

    // Calculate total feed exits per flock
    const feedPerFlock = await db
      .select({
        flockId: outboundExits.flockId,
        totalFeedKg: sql<string>`coalesce(sum(cast(${outboundExits.weight} as numeric)), 0)`,
      })
      .from(outboundExits)
      .where(isNull(outboundExits.deletedAt))
      .groupBy(outboundExits.flockId);

    const feedMap = new Map<string, number>();
    feedPerFlock.forEach((f) => {
      if (f.flockId) feedMap.set(f.flockId, parseFloat(f.totalFeedKg) || 0);
    });

    const report = allFlocks.map((fl) => {
      const feedKg = feedMap.get(fl.id) || 0;
      const liveWeightKg = parseFloat(fl.finalChickenWeight || '0');
      const fcr = calculateFCR(feedKg, liveWeightKg);
      const perCapitaGrams = calculatePerCapita(feedKg, fl.chickCount);

      return {
        ...fl,
        totalFeedConsumedKg: feedKg,
        liveWeightKg,
        fcr,
        perCapitaGrams,
      };
    });

    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reports/wastage-analysis
router.get('/wastage-analysis', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db
      .select({
        id: inboundEntries.id,
        entryNumber: inboundEntries.entryNumber,
        entryDate: inboundEntries.entryDate,
        sellerName: inboundEntries.sellerName,
        productId: inboundEntries.productId,
        billWeight: inboundEntries.billWeight,
        scaleWeight: inboundEntries.scaleWeight,
        wastage: inboundEntries.wastage,
        origin: inboundEntries.origin,
        productName: products.name,
      })
      .from(inboundEntries)
      .leftJoin(products, eq(inboundEntries.productId, products.id))
      .where(isNull(inboundEntries.deletedAt))
      .orderBy(desc(inboundEntries.entryDate));

    // Discrepancy summaries by seller
    const sellerSummary: Record<string, { totalBill: number; totalScale: number; totalWastage: number; count: number }> = {};
    rows.forEach((r) => {
      const seller = r.sellerName || 'نامشخص';
      if (!sellerSummary[seller]) {
        sellerSummary[seller] = { totalBill: 0, totalScale: 0, totalWastage: 0, count: 0 };
      }
      sellerSummary[seller].totalBill += parseFloat(r.billWeight) || 0;
      sellerSummary[seller].totalScale += parseFloat(r.scaleWeight) || 0;
      sellerSummary[seller].totalWastage += parseFloat(r.wastage) || 0;
      sellerSummary[seller].count += 1;
    });

    res.json({
      success: true,
      data: {
        records: rows,
        sellerSummary: Object.entries(sellerSummary).map(([seller, data]) => ({
          seller,
          ...data,
          discrepancyPercent:
            data.totalBill > 0 ? ((data.totalWastage / data.totalBill) * 100).toFixed(2) : '0.00',
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
