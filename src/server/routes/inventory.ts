import { Router } from 'express';
import { z } from 'zod';
import { eq, desc, and, isNull, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { getDb } from '../../db/index.ts';
import {
  inboundEntries,
  outboundExits,
  inventoryLedger,
  products,
  farmers,
  flocks,
  feedOrders,
  drivers,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { logAuditEvent } from '../services/auditService.ts';
import { calculateWastage } from '../../domain/farming/calculations.ts';

const router = Router();

// Validation Schemas
const inboundSchema = z.object({
  entryDate: z.string().min(10, 'تاریخ ورود الزامی است'), // YYYY-MM-DD
  sellerName: z.string().min(2, 'نام فروشنده الزامی است'),
  productId: z.string().min(1, 'انتخاب کالا الزامی است'),
  billWeight: z.number().positive('وزن بارنامه باید مثبت باشد'),
  scaleWeight: z.number().positive('وزن باسکول باید مثبت باشد'),
  billNumber: z.string().optional(),
  origin: z.string().optional(),
  factoryDestination: z.string().optional(),
  transportCost: z.number().nonnegative().optional().default(0),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  driverIban: z.string().optional(),
  driverId: z.string().optional(),
});

const outboundSchema = z.object({
  invoiceNumber: z.string().optional(),
  exitDate: z.string().min(10, 'تاریخ خروج الزامی است'),
  farmerId: z.string().min(1, 'انتخاب مرغدار الزامی است'),
  flockId: z.string().optional(),
  productId: z.string().min(1, 'انتخاب محصول الزامی است'),
  weight: z.number().positive('وزن خروجی باید مثبت باشد'),
  driverName: z.string().optional(),
  driverId: z.string().optional(),
  productVariant: z.string().optional(),
  isCrumble: z.boolean().optional().default(false),
  orderId: z.string().optional(),
});

const adjustmentSchema = z.object({
  productId: z.string().min(1, 'انتخاب کالا الزامی است'),
  action: z.enum(['ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE', 'REVERSAL']),
  quantityKg: z.number().positive('مقدار کسری/مازاد باید مثبت باشد'),
  reason: z.string().min(3, 'دلیل تعدیل الزامی است'),
  transactionDate: z.string().min(10).default(() => new Date().toISOString().slice(0, 10)),
});

// GET /api/v1/inventory/inbound
router.get('/inbound', requireAuth, async (req, res, next) => {
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
        billNumber: inboundEntries.billNumber,
        origin: inboundEntries.origin,
        factoryDestination: inboundEntries.factoryDestination,
        transportCost: inboundEntries.transportCost,
        driverName: inboundEntries.driverName,
        driverPhone: inboundEntries.driverPhone,
        driverIban: inboundEntries.driverIban,
        createdAt: inboundEntries.createdAt,
        productName: products.name,
      })
      .from(inboundEntries)
      .leftJoin(products, eq(inboundEntries.productId, products.id))
      .where(isNull(inboundEntries.deletedAt))
      .orderBy(desc(inboundEntries.entryDate), desc(inboundEntries.createdAt));

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/inventory/inbound
router.post(
  '/inbound',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR', 'WAREHOUSE_MANAGER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = inboundSchema.parse(req.body);
      const db = await getDb();

      const wastageCalc = calculateWastage(data.scaleWeight, data.billWeight);
      const entryId = crypto.randomUUID();
      const datePart = data.entryDate.replace(/-/g, '');
      const randPart = Math.floor(1000 + Math.random() * 9000);
      const entryNumber = `IN-${datePart}-${randPart}`;

      // Insert inbound scale ticket
      await db.insert(inboundEntries).values({
        id: entryId,
        entryNumber,
        entryDate: data.entryDate,
        sellerName: data.sellerName,
        productId: data.productId,
        billWeight: data.billWeight.toString(),
        scaleWeight: data.scaleWeight.toString(),
        wastage: wastageCalc.toString(),
        billNumber: data.billNumber || null,
        origin: data.origin || null,
        factoryDestination: data.factoryDestination || 'انبار مرکزی کارخانه',
        transportCost: (data.transportCost || 0).toString(),
        driverName: data.driverName || null,
        driverPhone: data.driverPhone || null,
        driverIban: data.driverIban || null,
        driverId: data.driverId || null,
        createdBy: req.user?.id || null,
      });

      // Add to immutable inventory ledger
      const ledgerId = crypto.randomUUID();
      await db.insert(inventoryLedger).values({
        id: ledgerId,
        transactionDate: data.entryDate,
        productId: data.productId,
        action: 'PURCHASE_RECEIPT',
        quantityChange: data.scaleWeight.toString(), // scale weight enters the factory
        referenceEntity: 'inbound_entries',
        referenceId: entryId,
        reason: `ورود بار شماره ${entryNumber} از ${data.sellerName}`,
        createdBy: req.user?.id || null,
      });

      await logAuditEvent({
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        action: 'CREATE_INBOUND_ENTRY',
        entityType: 'inbound_entries',
        entityId: entryId,
        newState: { entryNumber, sellerName: data.sellerName, scaleWeight: data.scaleWeight, wastage: wastageCalc },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      res.status(201).json({
        success: true,
        message: 'قبض ورود مواد اولیه با موفقیت ثبت شد',
        data: { id: entryId, entryNumber, wastage: wastageCalc },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/inventory/inbound/:id
router.delete(
  '/inbound/:id',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const db = await getDb();
      const existing = await db.select().from(inboundEntries).where(eq(inboundEntries.id, req.params.id));
      if (!existing[0] || existing[0].deletedAt) {
        return res.status(404).json({ success: false, error: 'قبض ورود یافت نشد' });
      }

      await db
        .update(inboundEntries)
        .set({ deletedAt: new Date() })
        .where(eq(inboundEntries.id, req.params.id));

      // Reversal in ledger
      const ledgerId = crypto.randomUUID();
      await db.insert(inventoryLedger).values({
        id: ledgerId,
        transactionDate: new Date().toISOString().slice(0, 10),
        productId: existing[0].productId,
        action: 'REVERSAL',
        quantityChange: (-parseFloat(existing[0].scaleWeight)).toString(),
        referenceEntity: 'inbound_entries',
        referenceId: req.params.id,
        reason: `ابطال قبض ورود ${existing[0].entryNumber}`,
        createdBy: req.user?.id || null,
      });

      await logAuditEvent({
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        action: 'DELETE_INBOUND_ENTRY',
        entityType: 'inbound_entries',
        entityId: req.params.id,
        oldState: existing[0],
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      res.json({ success: true, message: 'قبض ورود با موفقیت ابطال شد' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/inventory/outbound
router.get('/outbound', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const db = await getDb();
    let query = db
      .select({
        id: outboundExits.id,
        invoiceNumber: outboundExits.invoiceNumber,
        exitDate: outboundExits.exitDate,
        farmerId: outboundExits.farmerId,
        flockId: outboundExits.flockId,
        productId: outboundExits.productId,
        weight: outboundExits.weight,
        driverName: outboundExits.driverName,
        driverId: outboundExits.driverId,
        productVariant: outboundExits.productVariant,
        isCrumble: outboundExits.isCrumble,
        orderId: outboundExits.orderId,
        createdAt: outboundExits.createdAt,
        farmerName: farmers.fullName,
        productName: products.name,
        flockCode: flocks.flockCode,
      })
      .from(outboundExits)
      .leftJoin(farmers, eq(outboundExits.farmerId, farmers.id))
      .leftJoin(products, eq(outboundExits.productId, products.id))
      .leftJoin(flocks, eq(outboundExits.flockId, flocks.id))
      .where(isNull(outboundExits.deletedAt));

    if (req.user?.role === 'FARMER' && req.user.farmerId) {
      query = db
        .select({
          id: outboundExits.id,
          invoiceNumber: outboundExits.invoiceNumber,
          exitDate: outboundExits.exitDate,
          farmerId: outboundExits.farmerId,
          flockId: outboundExits.flockId,
          productId: outboundExits.productId,
          weight: outboundExits.weight,
          driverName: outboundExits.driverName,
          driverId: outboundExits.driverId,
          productVariant: outboundExits.productVariant,
          isCrumble: outboundExits.isCrumble,
          orderId: outboundExits.orderId,
          createdAt: outboundExits.createdAt,
          farmerName: farmers.fullName,
          productName: products.name,
          flockCode: flocks.flockCode,
        })
        .from(outboundExits)
        .leftJoin(farmers, eq(outboundExits.farmerId, farmers.id))
        .leftJoin(products, eq(outboundExits.productId, products.id))
        .leftJoin(flocks, eq(outboundExits.flockId, flocks.id))
        .where(and(isNull(outboundExits.deletedAt), eq(outboundExits.farmerId, req.user.farmerId)));
    }

    const rows = await query.orderBy(desc(outboundExits.exitDate), desc(outboundExits.createdAt));
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/inventory/outbound
router.post(
  '/outbound',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SCALE_OPERATOR', 'WAREHOUSE_MANAGER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = outboundSchema.parse(req.body);
      const db = await getDb();

      const exitId = crypto.randomUUID();
      const invoiceNumber =
        data.invoiceNumber ||
        `OUT-${data.exitDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      await db.insert(outboundExits).values({
        id: exitId,
        invoiceNumber,
        exitDate: data.exitDate,
        farmerId: data.farmerId,
        flockId: data.flockId || null,
        productId: data.productId,
        weight: data.weight.toString(),
        driverName: data.driverName || null,
        driverId: data.driverId || null,
        productVariant: data.productVariant || null,
        isCrumble: data.isCrumble || false,
        orderId: data.orderId || null,
        createdBy: req.user?.id || null,
      });

      // Deduct from inventory ledger
      const ledgerId = crypto.randomUUID();
      await db.insert(inventoryLedger).values({
        id: ledgerId,
        transactionDate: data.exitDate,
        productId: data.productId,
        action: 'SALES_DISPATCH',
        quantityChange: (-data.weight).toString(),
        referenceEntity: 'outbound_exits',
        referenceId: exitId,
        reason: `حواله خروج خوراک شماره ${invoiceNumber}`,
        createdBy: req.user?.id || null,
      });

      // If associated with an order, check if order should move to IN_TRANSIT or DELIVERED
      if (data.orderId) {
        await db
          .update(feedOrders)
          .set({ status: 'IN_TRANSIT', updatedAt: new Date() })
          .where(eq(feedOrders.id, data.orderId));
      }

      await logAuditEvent({
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        action: 'CREATE_OUTBOUND_EXIT',
        entityType: 'outbound_exits',
        entityId: exitId,
        newState: { invoiceNumber, farmerId: data.farmerId, weight: data.weight },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      res.status(201).json({
        success: true,
        message: 'حواله خروج دان با موفقیت ثبت و از انبار کسر شد',
        data: { id: exitId, invoiceNumber },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/inventory/stock
router.get('/stock', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const allProducts = await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(products.type, products.name);

    // Sum transactions per product from immutable ledger
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

    const enriched = allProducts.map((p) => {
      const currentStock = stockMap.get(p.id) || 0;
      const minAlert = parseFloat(p.minStockAlert || '0');
      const isLowStock = minAlert > 0 && currentStock <= minAlert;
      return {
        ...p,
        currentStockKg: currentStock,
        isLowStock,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/inventory/ledger
router.get('/ledger', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const productId = req.query.productId as string | undefined;

    let rows = await db
      .select({
        id: inventoryLedger.id,
        transactionDate: inventoryLedger.transactionDate,
        productId: inventoryLedger.productId,
        action: inventoryLedger.action,
        quantityChange: inventoryLedger.quantityChange,
        referenceEntity: inventoryLedger.referenceEntity,
        referenceId: inventoryLedger.referenceId,
        reason: inventoryLedger.reason,
        createdAt: inventoryLedger.createdAt,
        productName: products.name,
        productType: products.type,
      })
      .from(inventoryLedger)
      .leftJoin(products, eq(inventoryLedger.productId, products.id))
      .orderBy(desc(inventoryLedger.createdAt))
      .limit(200);

    if (productId) {
      rows = rows.filter((r) => r.productId === productId);
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/inventory/adjustments
router.post(
  '/adjustments',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = adjustmentSchema.parse(req.body);
      const db = await getDb();

      const signedQty =
        data.action === 'ADJUSTMENT_INCREASE'
          ? data.quantityKg
          : -data.quantityKg;

      const ledgerId = crypto.randomUUID();
      await db.insert(inventoryLedger).values({
        id: ledgerId,
        transactionDate: data.transactionDate,
        productId: data.productId,
        action: data.action,
        quantityChange: signedQty.toString(),
        referenceEntity: 'manual_adjustment',
        referenceId: ledgerId,
        reason: data.reason,
        createdBy: req.user?.id || null,
      });

      await logAuditEvent({
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        action: 'INVENTORY_ADJUSTMENT',
        entityType: 'inventory_ledger',
        entityId: ledgerId,
        newState: data,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      res.status(201).json({
        success: true,
        message: 'تعدیل موجودی انبار با موفقیت در دفتر کل ثبت شد',
        data: { ledgerId, quantityChange: signedQty },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
