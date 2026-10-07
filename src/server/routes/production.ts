import { Router } from 'express';
import { z } from 'zod';
import { eq, desc, and } from 'drizzle-orm';
import crypto from 'crypto';
import { getDb } from '../../db/index.ts';
import {
  productionBatches,
  formulas,
  formulaItems,
  products,
  inventoryLedger,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { logAuditEvent } from '../services/auditService.ts';

const router = Router();

const createBatchSchema = z.object({
  productionDate: z.string().min(10, 'تاریخ تولید الزامی است'), // YYYY-MM-DD
  finishedGoodId: z.string().min(1, 'انتخاب محصول نهایی الزامی است'),
  formulaId: z.string().min(1, 'انتخاب فرمول تولید الزامی است'),
  plannedQuantityKg: z.number().positive('تناژ برنامه‌ریزی شده باید مثبت باشد'),
  actualQuantityKg: z.number().positive('تناژ تولید واقعی باید مثبت باشد'),
  wasteKg: z.number().nonnegative().optional().default(0),
  operatorName: z.string().optional().default('اپراتور خط تولید'),
});

// GET /api/v1/production/batches
router.get('/batches', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db
      .select({
        id: productionBatches.id,
        batchNumber: productionBatches.batchNumber,
        productionDate: productionBatches.productionDate,
        finishedGoodId: productionBatches.finishedGoodId,
        formulaId: productionBatches.formulaId,
        plannedQuantityKg: productionBatches.plannedQuantityKg,
        actualQuantityKg: productionBatches.actualQuantityKg,
        wasteKg: productionBatches.wasteKg,
        operatorName: productionBatches.operatorName,
        createdAt: productionBatches.createdAt,
        productName: products.name,
        formulaTitle: formulas.title,
      })
      .from(productionBatches)
      .leftJoin(products, eq(productionBatches.finishedGoodId, products.id))
      .leftJoin(formulas, eq(productionBatches.formulaId, formulas.id))
      .orderBy(desc(productionBatches.productionDate), desc(productionBatches.createdAt));

    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/production/batches
router.post(
  '/batches',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const data = createBatchSchema.parse(req.body);
      const db = await getDb();

      // Fetch the formula and formula items
      const formulaRecord = await db.select().from(formulas).where(eq(formulas.id, data.formulaId));
      if (!formulaRecord[0]) {
        return res.status(404).json({ success: false, error: 'فرمول مورد نظر یافت نشد' });
      }

      const items = await db.select().from(formulaItems).where(eq(formulaItems.formulaId, data.formulaId));
      if (items.length === 0) {
        return res.status(400).json({ success: false, error: 'فرمول انتخاب شده فاقد اقلام مواد اولیه است' });
      }

      const batchBasis = parseFloat(formulaRecord[0].batchBasisKg) || 1000;
      const ratio = data.plannedQuantityKg / batchBasis;

      const batchId = crypto.randomUUID();
      const randCode = Math.floor(1000 + Math.random() * 9000);
      const batchNumber = `BATCH-${data.productionDate.replace(/-/g, '')}-${randCode}`;

      // Insert production batch
      await db.insert(productionBatches).values({
        id: batchId,
        batchNumber,
        productionDate: data.productionDate,
        finishedGoodId: data.finishedGoodId,
        formulaId: data.formulaId,
        plannedQuantityKg: data.plannedQuantityKg.toString(),
        actualQuantityKg: data.actualQuantityKg.toString(),
        wasteKg: (data.wasteKg || 0).toString(),
        operatorName: data.operatorName || 'اپراتور تولید',
        createdBy: req.user?.id || null,
      });

      // Deduct each raw material based on formula recipe
      for (const item of items) {
        const itemQtyKg = (parseFloat(item.quantityKg) || 0) * ratio;
        const ledgerId = crypto.randomUUID();
        await db.insert(inventoryLedger).values({
          id: ledgerId,
          transactionDate: data.productionDate,
          productId: item.rawMaterialId,
          action: 'PRODUCTION_CONSUMPTION',
          quantityChange: (-itemQtyKg).toString(),
          referenceEntity: 'production_batches',
          referenceId: batchId,
          reason: `مصرف در بچ تولید ${batchNumber} (${data.plannedQuantityKg} کیلوگرم)`,
          createdBy: req.user?.id || null,
        });
      }

      // Add finished feed into inventory
      const finishedLedgerId = crypto.randomUUID();
      await db.insert(inventoryLedger).values({
        id: finishedLedgerId,
        transactionDate: data.productionDate,
        productId: data.finishedGoodId,
        action: 'PRODUCTION_OUTPUT',
        quantityChange: data.actualQuantityKg.toString(),
        referenceEntity: 'production_batches',
        referenceId: batchId,
        reason: `تولید دان آماده در بچ شماره ${batchNumber}`,
        createdBy: req.user?.id || null,
      });

      await logAuditEvent({
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        action: 'EXECUTE_PRODUCTION_BATCH',
        entityType: 'production_batches',
        entityId: batchId,
        newState: {
          batchNumber,
          finishedGoodId: data.finishedGoodId,
          actualQuantityKg: data.actualQuantityKg,
          rawMaterialsCount: items.length,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      res.status(201).json({
        success: true,
        message: 'بچ تولید با موفقیت ثبت شد و کسر مواد اولیه و افزایش دان آماده اعمال گردید',
        data: { id: batchId, batchNumber },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/production/batches/:id
router.get('/batches/:id', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const batch = await db
      .select({
        id: productionBatches.id,
        batchNumber: productionBatches.batchNumber,
        productionDate: productionBatches.productionDate,
        finishedGoodId: productionBatches.finishedGoodId,
        formulaId: productionBatches.formulaId,
        plannedQuantityKg: productionBatches.plannedQuantityKg,
        actualQuantityKg: productionBatches.actualQuantityKg,
        wasteKg: productionBatches.wasteKg,
        operatorName: productionBatches.operatorName,
        createdAt: productionBatches.createdAt,
        productName: products.name,
      })
      .from(productionBatches)
      .leftJoin(products, eq(productionBatches.finishedGoodId, products.id))
      .where(eq(productionBatches.id, req.params.id));

    if (!batch[0]) {
      return res.status(404).json({ success: false, error: 'بچ تولید یافت نشد' });
    }

    // Ledger consumption details for this batch
    const consumptions = await db
      .select({
        id: inventoryLedger.id,
        productId: inventoryLedger.productId,
        quantityChange: inventoryLedger.quantityChange,
        action: inventoryLedger.action,
        productName: products.name,
      })
      .from(inventoryLedger)
      .leftJoin(products, eq(inventoryLedger.productId, products.id))
      .where(
        and(
          eq(inventoryLedger.referenceEntity, 'production_batches'),
          eq(inventoryLedger.referenceId, req.params.id)
        )
      );

    res.json({
      success: true,
      data: {
        batch: batch[0],
        materialsMovement: consumptions,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
