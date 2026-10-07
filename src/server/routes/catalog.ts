import { Router } from 'express';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';
import { getDb } from '../../db/index.ts';
import {
  products,
  productCategories,
  formulas,
  formulaItems,
  feedQuotas,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { logAuditEvent } from '../services/auditService.ts';
import { validateFormulaBalance } from '../../domain/farming/calculations.ts';

const router = Router();

// Schemas
const productSchema = z.object({
  name: z.string().min(2, 'نام کالا الزامی است'),
  code: z.string().optional(),
  type: z.enum(['RAW_MATERIAL', 'FINISHED_GOOD']),
  categoryId: z.string().optional(),
  unit: z.string().default('kg'),
  defaultPrice: z.string().optional(),
  minStockAlert: z.string().optional(),
});

const formulaSchema = z.object({
  finishedGoodId: z.string().min(1, 'محصول نهایی الزامی است'),
  title: z.string().min(2, 'عنوان فرمول الزامی است'),
  items: z.array(
    z.object({
      rawMaterialId: z.string().min(1),
      quantityKg: z.number().positive(),
    })
  ).min(1, 'حداقل یک ماده اولیه در فرمول الزامی است'),
});

// GET /api/v1/catalog/products
router.get('/products', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const typeFilter = req.query.type as string | undefined;

    let query = db.select().from(products).where(isNull(products.deletedAt));
    if (typeFilter === 'RAW_MATERIAL' || typeFilter === 'FINISHED_GOOD') {
      query = db.select().from(products).where(and(isNull(products.deletedAt), eq(products.type, typeFilter)));
    }

    const allProducts = await query.orderBy(products.name);
    res.json({ success: true, data: allProducts });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/catalog/products
router.post('/products', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = productSchema.parse(req.body);
    const db = await getDb();
    const id = `prod_${crypto.randomBytes(8).toString('hex')}`;

    const newProduct = {
      id,
      name: validated.name.trim(),
      code: validated.code || `PRD-${Date.now().toString().slice(-6)}`,
      type: validated.type,
      categoryId: validated.categoryId || null,
      unit: validated.unit,
      defaultPrice: validated.defaultPrice || '0',
      minStockAlert: validated.minStockAlert || '0',
    };

    await db.insert(products).values(newProduct);

    // If finished good, insert default 0 quota
    if (validated.type === 'FINISHED_GOOD') {
      await db.insert(feedQuotas).values({
        id: `q_${id}`,
        productId: id,
        quotaPerChickGrams: '1000.00',
        phaseDurationDays: 14,
      });
    }

    await logAuditEvent({
      userId: req.user?.id,
      userPhone: req.user?.phoneNumber,
      action: 'CREATE_PRODUCT',
      entityType: 'products',
      entityId: id,
      newState: newProduct,
      requestId: req.id,
    });

    res.status(201).json({ success: true, data: newProduct });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/catalog/quotas
router.get('/quotas', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const allQuotas = await db.select().from(feedQuotas);
    const allProducts = await db.select().from(products).where(isNull(products.deletedAt));
    const prodMap = new Map(allProducts.map((p) => [p.id, p]));

    const enriched = allQuotas.map((q) => ({
      ...q,
      product: prodMap.get(q.productId),
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/catalog/quotas/:id
router.put('/quotas/:id', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const quotaId = req.params.id;
    const { quotaPerChickGrams, phaseDurationDays } = req.body;

    const db = await getDb();
    await db
      .update(feedQuotas)
      .set({
        quotaPerChickGrams: String(Number(quotaPerChickGrams) || 0),
        phaseDurationDays: Number(phaseDurationDays) || 0,
      })
      .where(eq(feedQuotas.id, quotaId));

    res.json({ success: true, data: { message: 'سهمیه با موفقیت به‌روزرسانی شد' } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/catalog/formulas
router.get('/formulas', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const allFormulas = await db.select().from(formulas);
    const allItems = await db.select().from(formulaItems);
    const allProducts = await db.select().from(products).where(isNull(products.deletedAt));
    const prodMap = new Map(allProducts.map((p) => [p.id, p]));

    const result = allFormulas.map((f) => {
      const items = allItems
        .filter((item) => item.formulaId === f.id)
        .map((item) => ({
          ...item,
          rawMaterial: prodMap.get(item.rawMaterialId),
        }));

      return {
        ...f,
        finishedGood: prodMap.get(f.finishedGoodId),
        items,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/catalog/formulas
router.post('/formulas', requireAuth, requireRole('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PRODUCTION_MANAGER'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const validated = formulaSchema.parse(req.body);

    // Validate 1000kg BOM balance
    const balanceCheck = validateFormulaBalance(validated.items, 1000);
    if (!balanceCheck.isValid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'FORMULA_UNBALANCED',
          message: `مجموع مواد اولیه (${balanceCheck.totalQuantityKg} کیلوگرم) با مبنای ۱۰۰۰ کیلوگرم برابر نیست. اختلاف: ${balanceCheck.differenceKg} کیلوگرم`,
        },
      });
      return;
    }

    const db = await getDb();
    const formulaId = `form_${crypto.randomBytes(8).toString('hex')}`;

    await db.transaction(async (tx) => {
      await tx.insert(formulas).values({
        id: formulaId,
        finishedGoodId: validated.finishedGoodId,
        title: validated.title,
        batchBasisKg: '1000.000',
        isActive: true,
      });

      for (const item of validated.items) {
        await tx.insert(formulaItems).values({
          id: `fitem_${crypto.randomBytes(8).toString('hex')}`,
          formulaId,
          rawMaterialId: item.rawMaterialId,
          quantityKg: String(item.quantityKg),
        });
      }
    });

    await logAuditEvent({
      userId: req.user?.id,
      userPhone: req.user?.phoneNumber,
      action: 'CREATE_FORMULA',
      entityType: 'formulas',
      entityId: formulaId,
      newState: validated,
      requestId: req.id,
    });

    res.status(201).json({ success: true, data: { id: formulaId, message: 'فرمول تولید با موفقیت ثبت شد' } });
  } catch (err) {
    next(err);
  }
});

export default router;
