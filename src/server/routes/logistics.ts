import { Router } from 'express';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { getDb } from '../../db/index.ts';
import {
  drivers,
  vehicles,
  deliveries,
  feedOrders,
  farmers,
  products,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { logAuditEvent } from '../services/auditService.ts';

const router = Router();

// Validation Schemas
const driverSchema = z.object({
  fullName: z.string().min(2, 'نام راننده الزامی است'),
  phoneNumber: z.string().min(10, 'شماره تماس معتبر الزامی است'),
  nationalCode: z.string().optional(),
  iban: z.string().optional(),
  licenseNumber: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const vehicleSchema = z.object({
  driverId: z.string().optional(),
  plateNumber: z.string().min(4, 'شماره پلاک الزامی است'),
  model: z.string().optional(),
  capacityKg: z.number().positive('ظرفیت بارگیری باید مثبت باشد').optional(),
});

const deliverySchema = z.object({
  orderId: z.string().min(1, 'سفارش الزامی است'),
  driverId: z.string().min(1, 'انتخاب راننده الزامی است'),
  vehicleId: z.string().optional(),
  dispatchedWeightKg: z.number().positive('تناژ ارسالی الزامی است'),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/v1/logistics/drivers
router.get('/drivers', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.select().from(drivers).orderBy(drivers.fullName);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/logistics/drivers
router.post(
  '/drivers',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = driverSchema.parse(req.body);
      const db = await getDb();

      const driverId = crypto.randomUUID();
      await db.insert(drivers).values({
        id: driverId,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        nationalCode: data.nationalCode || null,
        iban: data.iban || null,
        licenseNumber: data.licenseNumber || null,
        isActive: data.isActive,
      });

      await logAuditEvent({
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        action: 'CREATE_DRIVER',
        entityType: 'drivers',
        entityId: driverId,
        newState: data,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      res.status(201).json({ success: true, message: 'راننده با موفقیت ثبت شد', data: { id: driverId } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/logistics/vehicles
router.get('/vehicles', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db
      .select({
        id: vehicles.id,
        plateNumber: vehicles.plateNumber,
        model: vehicles.model,
        capacityKg: vehicles.capacityKg,
        driverId: vehicles.driverId,
        createdAt: vehicles.createdAt,
        driverName: drivers.fullName,
      })
      .from(vehicles)
      .leftJoin(drivers, eq(vehicles.driverId, drivers.id))
      .orderBy(vehicles.plateNumber);

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/logistics/vehicles
router.post(
  '/vehicles',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = vehicleSchema.parse(req.body);
      const db = await getDb();

      const vehicleId = crypto.randomUUID();
      await db.insert(vehicles).values({
        id: vehicleId,
        driverId: data.driverId || null,
        plateNumber: data.plateNumber,
        model: data.model || null,
        capacityKg: data.capacityKg ? data.capacityKg.toString() : null,
      });

      res.status(201).json({ success: true, message: 'کامیون با موفقیت ثبت شد', data: { id: vehicleId } });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/logistics/deliveries
router.get('/deliveries', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = await getDb();
    const whereCondition =
      req.user?.role === 'DRIVER' && req.user.driverId
        ? eq(deliveries.driverId, req.user.driverId)
        : undefined;

    const rows = await db
      .select({
        id: deliveries.id,
        deliveryNumber: deliveries.deliveryNumber,
        orderId: deliveries.orderId,
        driverId: deliveries.driverId,
        vehicleId: deliveries.vehicleId,
        dispatchedWeightKg: deliveries.dispatchedWeightKg,
        invoiceNumber: deliveries.invoiceNumber,
        departureTime: deliveries.departureTime,
        deliveryTime: deliveries.deliveryTime,
        status: deliveries.status,
        deliveryConfirmationCode: deliveries.deliveryConfirmationCode,
        createdAt: deliveries.createdAt,
        driverName: drivers.fullName,
        driverPhone: drivers.phoneNumber,
        plateNumber: vehicles.plateNumber,
        orderNumber: feedOrders.orderNumber,
        farmerId: feedOrders.farmerId,
        productName: products.name,
      })
      .from(deliveries)
      .leftJoin(drivers, eq(deliveries.driverId, drivers.id))
      .leftJoin(vehicles, eq(deliveries.vehicleId, vehicles.id))
      .leftJoin(feedOrders, eq(deliveries.orderId, feedOrders.id))
      .leftJoin(products, eq(feedOrders.productId, products.id))
      .where(whereCondition)
      .orderBy(desc(deliveries.createdAt));

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/logistics/deliveries
router.post(
  '/deliveries',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = deliverySchema.parse(req.body);
      const db = await getDb();

      const deliveryId = crypto.randomUUID();
      const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit confirmation code
      const delNumber = `DEL-${Date.now().toString().slice(-6)}`;
      const invNumber = data.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;

      await db.insert(deliveries).values({
        id: deliveryId,
        deliveryNumber: delNumber,
        orderId: data.orderId,
        driverId: data.driverId,
        vehicleId: data.vehicleId || null,
        dispatchedWeightKg: data.dispatchedWeightKg.toString(),
        invoiceNumber: invNumber,
        departureTime: new Date(),
        deliveryConfirmationCode: code,
        status: 'IN_TRANSIT',
      });

      // Update order status to IN_TRANSIT
      await db
        .update(feedOrders)
        .set({ status: 'IN_TRANSIT', updatedAt: new Date() })
        .where(eq(feedOrders.id, data.orderId));

      await logAuditEvent({
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        action: 'DISPATCH_DELIVERY',
        entityType: 'deliveries',
        entityId: deliveryId,
        newState: { deliveryNumber: delNumber, orderId: data.orderId, driverId: data.driverId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      res.status(201).json({
        success: true,
        message: 'مجوز خروج و اعزام راننده با موفقیت صادر شد',
        data: { id: deliveryId, deliveryNumber: delNumber, confirmationCode: code },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/logistics/deliveries/:id/confirm
router.post('/deliveries/:id/confirm', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const code = req.body.code as string | undefined;
    const db = await getDb();

    const del = await db.select().from(deliveries).where(eq(deliveries.id, req.params.id));
    if (!del[0]) {
      return res.status(404).json({ success: false, error: 'حواله حمل یافت نشد' });
    }

    if (code && del[0].deliveryConfirmationCode && del[0].deliveryConfirmationCode !== code) {
      return res.status(400).json({ success: false, error: 'کد تأیید تحویل نامعتبر است' });
    }

    await db
      .update(deliveries)
      .set({
        status: 'CONFIRMED',
        deliveryTime: new Date(),
      })
      .where(eq(deliveries.id, req.params.id));

    // Update order status to CONFIRMED / DELIVERED
    if (del[0].orderId) {
      await db
        .update(feedOrders)
        .set({ status: 'CONFIRMED', updatedAt: new Date() })
        .where(eq(feedOrders.id, del[0].orderId));
    }

    await logAuditEvent({
      userId: req.user?.id,
      userPhone: req.user?.phoneNumber,
      action: 'CONFIRM_DELIVERY',
      entityType: 'deliveries',
      entityId: req.params.id,
      newState: { status: 'CONFIRMED' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
    });

    res.json({ success: true, message: 'تحویل بار در مرغداری با موفقیت تایید و ثبت نهایی شد' });
  } catch (err) {
    next(err);
  }
});

export default router;
