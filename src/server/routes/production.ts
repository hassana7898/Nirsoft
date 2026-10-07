import { Router } from 'express';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../db/index.ts';
import {
  productionBatches,
  formulas,
  products,
  inventoryLedger,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { executeProductionBatch } from '../../domain/production/productionService.ts';

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

      const result = await executeProductionBatch({
        productionDate: data.productionDate,
        finishedGoodId: data.finishedGoodId,
        formulaId: data.formulaId,
        plannedQuantityKg: data.plannedQuantityKg,
        actualQuantityKg: data.actualQuantityKg,
        wasteKg: data.wasteKg,
        operatorName: data.operatorName,
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        requestId: req.requestId,
      });

      res.status(201).json({
        success: true,
        message: 'بچ تولید با موفقیت در تراکنش اتمیک ثبت شد و کسر مواد اولیه و ورود دان آماده اعمال گردید',
        data: result,
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
        eq(inventoryLedger.referenceId, req.params.id)
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
