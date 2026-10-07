import { Router } from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { getDb } from '../../db/index.ts';
import {
  feedOrders,
  flocks,
  farmers,
  products,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole, enforceFarmerScope } from '../middleware/auth.ts';
import { logAuditEvent } from '../services/auditService.ts';

const router = Router();

const orderCreateSchema = z.object({
  flockId: z.string().min(1, 'انتخاب گله الزامی است'),
  productId: z.string().min(1, 'انتخاب نوع دان الزامی است'),
  requestedQuantityKg: z.number().positive('تناژ دان باید عدد مثبت باشد'),
  productVariant: z.string().optional(),
  isCrumble: z.boolean().default(false),
  requestedDate: z.string().min(10, 'تاریخ تحویل درخواستی الزامی است'),
  notes: z.string().optional(),
});

// Allowed State Machine transitions map
const VALID_TRANSITIONS: Record<string, { nextState: typeof feedOrders.$inferSelect.status; allowedRoles: string[] }> = {
  SUBMIT: { nextState: 'SUBMITTED', allowedRoles: ['FARMER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
  APPROVE: { nextState: 'APPROVED', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_MANAGER'] },
  REJECT: { nextState: 'REJECTED', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_MANAGER'] },
  SCHEDULE_PROD: { nextState: 'PRODUCTION_PENDING', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'] },
  MARK_READY: { nextState: 'READY', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PRODUCTION_MANAGER', 'WAREHOUSE_MANAGER'] },
  ASSIGN_DRIVER: { nextState: 'ASSIGNED_TO_DRIVER', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR', 'SALES_MANAGER'] },
  LOAD_TRUCK: { nextState: 'PICKED_UP', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR'] },
  DISPATCH: { nextState: 'IN_TRANSIT', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR', 'DRIVER'] },
  DELIVER: { nextState: 'DELIVERED', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'DRIVER'] },
  CONFIRM: { nextState: 'CONFIRMED', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FARMER', 'SCALE_OPERATOR'] },
  CANCEL: { nextState: 'CANCELLED', allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FARMER'] },
};

// GET /api/v1/orders
router.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = await getDb();
    const whereCondition = req.user?.role === 'FARMER' && req.user.farmerId
      ? eq(feedOrders.farmerId, req.user.farmerId)
      : undefined;

    const allOrders = await db
      .select()
      .from(feedOrders)
      .where(whereCondition)
      .orderBy(desc(feedOrders.createdAt));
    const allFarmers = await db.select().from(farmers);
    const allProducts = await db.select().from(products);
    const allFlocks = await db.select().from(flocks);

    const fMap = new Map(allFarmers.map((f) => [f.id, f.fullName]));
    const pMap = new Map(allProducts.map((p) => [p.id, p.name]));
    const flMap = new Map(allFlocks.map((fl) => [fl.id, fl.flockCode || fl.id]));

    const enriched = allOrders.map((o) => ({
      ...o,
      farmerName: fMap.get(o.farmerId) || 'نامشخص',
      productName: pMap.get(o.productId) || 'نامشخص',
      flockCode: flMap.get(o.flockId) || 'نامشخص',
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/orders
router.post('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = orderCreateSchema.parse(req.body);
    const db = await getDb();

    const [flock] = await db.select().from(flocks).where(eq(flocks.id, validated.flockId));
    if (!flock) {
      res.status(404).json({ success: false, error: { message: 'گله انتخاب شده یافت نشد' } });
      return;
    }

    if (!enforceFarmerScope(req, flock.farmerId)) {
      res.status(403).json({ success: false, error: { message: 'شما دسترسی به ثبت سفارش برای این مرغدار را ندارید' } });
      return;
    }

    const orderId = `ord_${crypto.randomBytes(8).toString('hex')}`;
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    const newOrder = {
      id: orderId,
      orderNumber,
      farmerId: flock.farmerId,
      flockId: validated.flockId,
      productId: validated.productId,
      requestedQuantityKg: String(validated.requestedQuantityKg),
      productVariant: validated.productVariant || null,
      isCrumble: validated.isCrumble,
      status: 'SUBMITTED' as const,
      requestedDate: validated.requestedDate,
      notes: validated.notes || null,
    };

    await db.insert(feedOrders).values(newOrder);

    await logAuditEvent({
      userId: req.user?.id,
      userPhone: req.user?.phoneNumber,
      action: 'CREATE_FEED_ORDER',
      entityType: 'feed_orders',
      entityId: orderId,
      newState: newOrder,
      requestId: req.id,
    });

    res.status(201).json({ success: true, data: newOrder });
  } catch (err) {
    next(err);
  }
});

// Handler for transitioning order status
async function handleOrderTransition(req: AuthenticatedRequest, res: any, next: any) {
  try {
    const orderId = req.params.id;
    const { action, notes } = req.body;

    const transitionRule = VALID_TRANSITIONS[action];
    if (!transitionRule) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_ACTION', message: `اقدام وضعیت "${action}" نامعتبر است.` },
      });
      return;
    }

    // Role check
    if (!req.user || (!transitionRule.allowedRoles.includes(req.user.role) && req.user.role !== 'SUPER_ADMIN')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'شما دسترسی لازم برای تغییر وضعیت این سفارش به حالت درخواستی را ندارید.' },
      });
      return;
    }

    const db = await getDb();
    const [order] = await db.select().from(feedOrders).where(eq(feedOrders.id, orderId));
    if (!order) {
      res.status(404).json({ success: false, error: { message: 'سفارش یافت نشد' } });
      return;
    }

    // Object scoping: if farmer, verify ownership
    if (req.user.role === 'FARMER' && !enforceFarmerScope(req, order.farmerId)) {
      res.status(403).json({ success: false, error: { message: 'دسترسی غیرمجاز به سفارش مرغدار دیگر' } });
      return;
    }

    const nextState = transitionRule.nextState;
    const updateData: Partial<typeof feedOrders.$inferSelect> = {
      status: nextState,
      updatedAt: new Date(),
    };

    if (nextState === 'APPROVED') {
      updateData.approvedBy = req.user.id;
      updateData.approvedAt = new Date();
    }

    await db.update(feedOrders).set(updateData).where(eq(feedOrders.id, orderId));

    await logAuditEvent({
      userId: req.user.id,
      userPhone: req.user.phoneNumber,
      action: `ORDER_TRANSITION_${action}`,
      entityType: 'feed_orders',
      entityId: orderId,
      oldState: { status: order.status },
      newState: { status: nextState, notes },
      requestId: req.requestId,
    });

    res.json({
      success: true,
      data: {
        orderId,
        previousStatus: order.status,
        currentStatus: nextState,
        message: `وضعیت سفارش با موفقیت به ${nextState} تغییر یافت.`,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/orders/:id/transition & POST /api/v1/orders/:id/action
router.post('/:id/transition', requireAuth, handleOrderTransition);
router.post('/:id/action', requireAuth, handleOrderTransition);

export default router;
