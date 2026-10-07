import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { getDb } from '../../db/index.ts';
import {
  farmers,
  farms,
  poultryHouses,
  flocks,
  dailyFlockRecords,
  feedOrders,
  outboundExits,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole, enforceFarmerScope } from '../middleware/auth.ts';
import { logAuditEvent } from '../services/auditService.ts';
import {
  calculateFCR,
  calculateFeedQuota,
  calculatePerCapita,
  calculateFlockDuration,
  normalizePersianDigits,
  normalizePersianText,
} from '../../domain/farming/calculations.ts';

const router = Router();

// Validation Schemas
const farmerSchema = z.object({
  fullName: z.string().min(2, 'نام مرغدار الزامی است'),
  code: z.string().optional(),
  nationalId: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  creditLimit: z.string().optional(),
});

const flockSchema = z.object({
  farmerId: z.string().min(1, 'انتخاب مرغدار الزامی است'),
  farmId: z.string().optional(),
  houseId: z.string().optional(),
  flockCode: z.string().optional(),
  breed: z.string().default('Ross 308'),
  chickCount: z.number().positive('تعداد جوجه باید عدد مثبت باشد'),
  startDate: z.string().min(10, 'تاریخ شروع الزامی است'), // YYYY-MM-DD
  expectedEndDate: z.string().optional(),
  notes: z.string().optional(),
});

const dailyRecordSchema = z.object({
  recordDate: z.string().min(10, 'تاریخ الزامی است'),
  dayOfAge: z.number().int().nonnegative(),
  mortalityCount: z.number().int().nonnegative().default(0),
  feedConsumedKg: z.number().nonnegative().default(0),
  waterConsumedLiters: z.number().nonnegative().default(0),
  averageWeightGrams: z.number().nonnegative().default(0),
  temperatureCelsius: z.number().optional(),
  notes: z.string().optional(),
});

// GET /api/v1/farming/farmers
router.get('/farmers', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = await getDb();
    
    // Object-level scoping: If farmer, only fetch their own profile
    if (req.user?.role === 'FARMER' && req.user.farmerId) {
      const myFarmer = await db.select().from(farmers).where(eq(farmers.id, req.user.farmerId));
      res.json({ success: true, data: myFarmer });
      return;
    }

    const allFarmers = await db
      .select()
      .from(farmers)
      .where(isNull(farmers.deletedAt))
      .orderBy(farmers.fullName);

    res.json({ success: true, data: allFarmers });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/farming/farmers
router.get('/farmers/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const farmerId = req.params.id;
    if (!enforceFarmerScope(req, farmerId)) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'عدم دسترسی به اطلاعات این مرغدار' } });
      return;
    }

    const db = await getDb();
    const [farmer] = await db.select().from(farmers).where(eq(farmers.id, farmerId));
    if (!farmer) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'مرغدار یافت نشد' } });
      return;
    }

    const farmerFarms = await db.select().from(farms).where(and(eq(farms.farmerId, farmerId), isNull(farms.deletedAt)));
    const farmerFlocks = await db.select().from(flocks).where(and(eq(flocks.farmerId, farmerId), isNull(flocks.deletedAt))).orderBy(desc(flocks.createdAt));

    res.json({
      success: true,
      data: {
        ...farmer,
        farms: farmerFarms,
        flocks: farmerFlocks,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/farming/farmers
router.post('/farmers', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_MANAGER'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = farmerSchema.parse(req.body);
    const db = await getDb();
    const id = `farmer_${crypto.randomBytes(8).toString('hex')}`;

    const newFarmer = {
      id,
      code: validated.code || `FRM-${Date.now().toString().slice(-6)}`,
      fullName: normalizePersianText(validated.fullName),
      nationalId: validated.nationalId ? normalizePersianDigits(validated.nationalId) : null,
      phoneNumber: validated.phoneNumber ? normalizePersianDigits(validated.phoneNumber) : null,
      address: validated.address || null,
      creditLimit: validated.creditLimit || '0',
    };

    await db.insert(farmers).values(newFarmer);

    // Auto-create default farm
    const farmId = `farm_${crypto.randomBytes(8).toString('hex')}`;
    await db.insert(farms).values({
      id: farmId,
      farmerId: id,
      name: `مزرعه اصلی ${newFarmer.fullName}`,
      capacity: 20000,
    });

    await logAuditEvent({
      userId: req.user?.id,
      userPhone: req.user?.phoneNumber,
      action: 'CREATE_FARMER',
      entityType: 'farmers',
      entityId: id,
      newState: newFarmer,
      requestId: req.id,
    });

    res.status(201).json({ success: true, data: newFarmer });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/farming/farmers/merge (Legacy preservation)
router.post('/farmers/merge', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { sourceId, targetId } = req.body;
    if (!sourceId || !targetId || sourceId === targetId) {
      res.status(400).json({ success: false, error: { message: 'شناسه مرغدار مبدا و مقصد نامعتبر است' } });
      return;
    }

    const db = await getDb();
    await db.transaction(async (tx) => {
      // Move all flocks, exits, and orders to target farmer
      await tx.update(flocks).set({ farmerId: targetId }).where(eq(flocks.farmerId, sourceId));
      await tx.update(outboundExits).set({ farmerId: targetId }).where(eq(outboundExits.farmerId, sourceId));
      await tx.update(feedOrders).set({ farmerId: targetId }).where(eq(feedOrders.farmerId, sourceId));
      await tx.update(farmers).set({ deletedAt: new Date(), isHidden: true }).where(eq(farmers.id, sourceId));
    });

    await logAuditEvent({
      userId: req.user?.id,
      userPhone: req.user?.phoneNumber,
      action: 'MERGE_FARMERS',
      entityType: 'farmers',
      entityId: targetId,
      oldState: { sourceId },
      newState: { targetId },
      requestId: req.id,
    });

    res.json({ success: true, data: { message: 'مرغداران با موفقیت ادغام شدند' } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/farming/flocks
router.get('/flocks', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = await getDb();
    const farmerIdQuery = req.query.farmerId as string | undefined;

    let query = db.select().from(flocks).where(isNull(flocks.deletedAt));
    if (req.user?.role === 'FARMER' && req.user.farmerId) {
      query = db.select().from(flocks).where(and(isNull(flocks.deletedAt), eq(flocks.farmerId, req.user.farmerId)));
    } else if (farmerIdQuery) {
      query = db.select().from(flocks).where(and(isNull(flocks.deletedAt), eq(flocks.farmerId, farmerIdQuery)));
    }

    const allFlocks = await query.orderBy(desc(flocks.startDate));
    res.json({ success: true, data: allFlocks });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/farming/flocks/:id (Detailed flock metrics with FCR and quotas)
router.get('/flocks/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = await getDb();
    const flockId = req.params.id;

    const [flock] = await db.select().from(flocks).where(eq(flocks.id, flockId));
    if (!flock) {
      res.status(404).json({ success: false, error: { message: 'گله یافت نشد' } });
      return;
    }

    if (!enforceFarmerScope(req, flock.farmerId)) {
      res.status(403).json({ success: false, error: { message: 'عدم دسترسی به اطلاعات این گله' } });
      return;
    }

    const [farmer] = await db.select().from(farmers).where(eq(farmers.id, flock.farmerId));
    const exits = await db.select().from(outboundExits).where(eq(outboundExits.flockId, flockId));
    const records = await db.select().from(dailyFlockRecords).where(eq(dailyFlockRecords.flockId, flockId)).orderBy(dailyFlockRecords.recordDate);

    // Sum total feed delivered
    const totalDeliveredFeedKg = exits.reduce((sum, e) => sum + (Number(e.weight) || 0), 0);
    const finalChickenWeightKg = Number(flock.finalChickenWeight) || 0;

    const durationDays = calculateFlockDuration(flock.startDate, flock.actualEndDate);
    const fcr = calculateFCR(totalDeliveredFeedKg, finalChickenWeightKg);
    const perCapitaGrams = calculatePerCapita(totalDeliveredFeedKg, flock.chickCount);

    res.json({
      success: true,
      data: {
        ...flock,
        farmerName: farmer?.fullName,
        durationDays,
        totalDeliveredFeedKg,
        fcr,
        perCapitaGrams,
        exits,
        dailyRecords: records,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/farming/flocks
router.post('/flocks', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = flockSchema.parse(req.body);

    if (!enforceFarmerScope(req, validated.farmerId)) {
      res.status(403).json({ success: false, error: { message: 'امکان ثبت گله برای این مرغدار را ندارید' } });
      return;
    }

    const db = await getDb();
    const id = `flock_${crypto.randomBytes(8).toString('hex')}`;

    const newFlock = {
      id,
      farmerId: validated.farmerId,
      farmId: validated.farmId || null,
      houseId: validated.houseId || null,
      flockCode: validated.flockCode || `FLK-${Date.now().toString().slice(-6)}`,
      breed: validated.breed,
      chickCount: validated.chickCount,
      startDate: validated.startDate,
      expectedEndDate: validated.expectedEndDate || null,
      status: 'ACTIVE' as const,
      notes: validated.notes || null,
    };

    await db.insert(flocks).values(newFlock);

    await logAuditEvent({
      userId: req.user?.id,
      userPhone: req.user?.phoneNumber,
      action: 'CREATE_FLOCK',
      entityType: 'flocks',
      entityId: id,
      newState: newFlock,
      requestId: req.id,
    });

    res.status(201).json({ success: true, data: newFlock });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/farming/flocks/:id/finish (Complete brood and record slaughter weight)
router.post('/flocks/:id/finish', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const flockId = req.params.id;
    const { actualEndDate, finalChickenWeight } = req.body;

    const db = await getDb();
    const [flock] = await db.select().from(flocks).where(eq(flocks.id, flockId));
    if (!flock) {
      res.status(404).json({ success: false, error: { message: 'گله یافت نشد' } });
      return;
    }

    if (!enforceFarmerScope(req, flock.farmerId)) {
      res.status(403).json({ success: false, error: { message: 'دسترسی غیرمجاز' } });
      return;
    }

    const updated = {
      status: 'COMPLETED' as const,
      actualEndDate: actualEndDate || new Date().toISOString().slice(0, 10),
      finalChickenWeight: String(Number(finalChickenWeight) || 0),
      updatedAt: new Date(),
    };

    await db.update(flocks).set(updated).where(eq(flocks.id, flockId));

    await logAuditEvent({
      userId: req.user?.id,
      userPhone: req.user?.phoneNumber,
      action: 'COMPLETE_FLOCK',
      entityType: 'flocks',
      entityId: flockId,
      oldState: flock,
      newState: updated,
      requestId: req.id,
    });

    res.json({ success: true, data: { message: 'دوره گله با موفقیت پایان یافت و ثبت شد' } });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/farming/flocks/:id/daily-records
router.post('/flocks/:id/daily-records', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const flockId = req.params.id;
    const validated = dailyRecordSchema.parse(req.body);

    const db = await getDb();
    const [flock] = await db.select().from(flocks).where(eq(flocks.id, flockId));
    if (!flock) {
      res.status(404).json({ success: false, error: { message: 'گله یافت نشد' } });
      return;
    }

    if (!enforceFarmerScope(req, flock.farmerId)) {
      res.status(403).json({ success: false, error: { message: 'دسترسی غیرمجاز' } });
      return;
    }

    const id = `rec_${crypto.randomBytes(8).toString('hex')}`;
    await db.insert(dailyFlockRecords).values({
      id,
      flockId,
      recordDate: validated.recordDate,
      dayOfAge: validated.dayOfAge,
      mortalityCount: validated.mortalityCount,
      feedConsumedKg: String(validated.feedConsumedKg),
      waterConsumedLiters: String(validated.waterConsumedLiters),
      averageWeightGrams: String(validated.averageWeightGrams),
      temperatureCelsius: validated.temperatureCelsius ? String(validated.temperatureCelsius) : null,
      notes: validated.notes || null,
    });

    res.status(201).json({ success: true, data: { message: 'رکورد روزانه با موفقیت ثبت شد' } });
  } catch (err) {
    next(err);
  }
});

export default router;
