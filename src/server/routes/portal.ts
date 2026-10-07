import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { getDb } from '../../db/index.ts';
import {
  farmers,
  flocks,
  dailyFlockRecords,
  feedOrders,
  outboundExits,
  deliveries,
  drivers,
  vehicles,
  products,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { calculateFCR, calculatePerCapita, calculateFlockDuration } from '../../domain/farming/calculations.ts';
import { transitionOrderStatus } from '../../domain/orders/orderService.ts';

const router = Router();

// Validation Schemas
const farmerDailyRecordSchema = z.object({
  flockId: z.string().min(1, 'شناسه گله الزامی است'),
  recordDate: z.string().min(10, 'تاریخ ثبت الزامی است'),
  dayOfAge: z.number().int().nonnegative(),
  mortalityCount: z.number().int().nonnegative().default(0),
  feedConsumedKg: z.number().nonnegative().default(0),
  waterConsumedLiters: z.number().nonnegative().default(0),
  averageWeightGrams: z.number().nonnegative().default(0),
  temperatureCelsius: z.number().optional(),
  notes: z.string().optional(),
});

const driverStatusSchema = z.object({
  deliveryId: z.string().min(1),
  status: z.enum(['IN_TRANSIT', 'DELIVERED']),
});

// ==========================================
// 1. FARMER PORTAL ENDPOINTS
// ==========================================

// GET /api/v1/portal/farmer/overview
router.get('/farmer/overview', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = await getDb();
    let farmerId = req.user?.farmerId;

    // In dev / admin preview, if no farmerId is linked, find first farmer
    if (!farmerId) {
      if (['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user?.role || '')) {
        const firstFarmer = await db.select().from(farmers).where(isNull(farmers.deletedAt)).limit(1);
        farmerId = firstFarmer[0]?.id;
      } else {
        return res.status(403).json({ success: false, error: 'حساب کاربری شما به هیچ مرغداری متصل نیست.' });
      }
    }

    if (!farmerId) {
      return res.status(404).json({ success: false, error: 'اطلاعات مرغدار یافت نشد.' });
    }

    const farmerRecord = await db.select().from(farmers).where(eq(farmers.id, farmerId));
    const activeFlocks = await db
      .select()
      .from(flocks)
      .where(and(eq(flocks.farmerId, farmerId), eq(flocks.status, 'ACTIVE'), isNull(flocks.deletedAt)));

    const myOrders = await db
      .select({
        id: feedOrders.id,
        orderNumber: feedOrders.orderNumber,
        requestedQuantityKg: feedOrders.requestedQuantityKg,
        requestedDate: feedOrders.requestedDate,
        status: feedOrders.status,
        productName: products.name,
      })
      .from(feedOrders)
      .leftJoin(products, eq(feedOrders.productId, products.id))
      .where(eq(feedOrders.farmerId, farmerId))
      .orderBy(desc(feedOrders.createdAt))
      .limit(5);

    const feedExits = await db
      .select({
        totalFeed: sql<string>`coalesce(sum(cast(${outboundExits.weight} as numeric)), 0)`,
      })
      .from(outboundExits)
      .where(and(eq(outboundExits.farmerId, farmerId), isNull(outboundExits.deletedAt)));

    res.json({
      success: true,
      data: {
        farmer: farmerRecord[0],
        activeFlocks,
        recentOrders: myOrders,
        totalFeedReceivedKg: parseFloat(feedExits[0]?.totalFeed || '0'),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/portal/farmer/daily-record
router.post('/farmer/daily-record', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = farmerDailyRecordSchema.parse(req.body);
    const db = await getDb();

    // Verify flock ownership if user is a farmer
    if (req.user?.role === 'FARMER' && req.user.farmerId) {
      const flockCheck = await db
        .select()
        .from(flocks)
        .where(and(eq(flocks.id, data.flockId), eq(flocks.farmerId, req.user.farmerId)));
      if (!flockCheck[0]) {
        return res.status(403).json({ success: false, error: 'دسترسی غیرمجاز به این گله.' });
      }
    }

    const recordId = crypto.randomUUID();
    await db.insert(dailyFlockRecords).values({
      id: recordId,
      flockId: data.flockId,
      recordDate: data.recordDate,
      dayOfAge: data.dayOfAge,
      mortalityCount: data.mortalityCount,
      feedConsumedKg: data.feedConsumedKg.toString(),
      waterConsumedLiters: data.waterConsumedLiters.toString(),
      averageWeightGrams: data.averageWeightGrams.toString(),
      temperatureCelsius: data.temperatureCelsius ? data.temperatureCelsius.toString() : null,
      notes: data.notes || null,
    });

    res.status(201).json({ success: true, message: 'آمار روزانه سالن مرغداری با موفقیت ثبت شد', data: { recordId } });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. DRIVER PORTAL ENDPOINTS
// ==========================================

// GET /api/v1/portal/driver/overview
router.get('/driver/overview', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = await getDb();
    let driverId = req.user?.driverId;

    if (!driverId) {
      if (['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(req.user?.role || '')) {
        const firstDriver = await db.select().from(drivers).where(eq(drivers.isActive, true)).limit(1);
        driverId = firstDriver[0]?.id;
      } else {
        return res.status(403).json({ success: false, error: 'حساب کاربری شما به عنوان راننده تعریف نشده است.' });
      }
    }

    if (!driverId) {
      return res.status(404).json({ success: false, error: 'اطلاعات راننده یافت نشد.' });
    }

    const driverRecord = await db.select().from(drivers).where(eq(drivers.id, driverId));
    const vehicleRecord = await db.select().from(vehicles).where(eq(vehicles.driverId, driverId));

    const activeAssignments = await db
      .select({
        id: deliveries.id,
        deliveryNumber: deliveries.deliveryNumber,
        dispatchedWeightKg: deliveries.dispatchedWeightKg,
        status: deliveries.status,
        invoiceNumber: deliveries.invoiceNumber,
        confirmationCode: deliveries.deliveryConfirmationCode,
        createdAt: deliveries.createdAt,
        orderNumber: feedOrders.orderNumber,
        farmerName: farmers.fullName,
        farmerPhone: farmers.phoneNumber,
        farmerAddress: farmers.address,
        productName: products.name,
      })
      .from(deliveries)
      .leftJoin(feedOrders, eq(deliveries.orderId, feedOrders.id))
      .leftJoin(farmers, eq(feedOrders.farmerId, farmers.id))
      .leftJoin(products, eq(feedOrders.productId, products.id))
      .where(eq(deliveries.driverId, driverId))
      .orderBy(desc(deliveries.createdAt));

    res.json({
      success: true,
      data: {
        driver: driverRecord[0],
        vehicle: vehicleRecord[0] || null,
        assignments: activeAssignments,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/portal/driver/update-status
router.post('/driver/update-status', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { deliveryId, status } = driverStatusSchema.parse(req.body);
    const db = await getDb();

    const del = await db.select().from(deliveries).where(eq(deliveries.id, deliveryId));
    if (!del[0]) {
      return res.status(404).json({ success: false, error: 'محموله یافت نشد.' });
    }

    await db.update(deliveries).set({ status }).where(eq(deliveries.id, deliveryId));

    if (del[0].orderId) {
      await db.update(feedOrders).set({ status }).where(eq(feedOrders.id, del[0].orderId));
    }

    res.json({ success: true, message: `وضعیت محموله به ${status} به‌روزرسانی شد.` });
  } catch (err) {
    next(err);
  }
});

export default router;
