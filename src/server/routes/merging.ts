import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { mergeFarmers, mergeDrivers, mergeProducts } from '../../domain/merging/mergeService.ts';

const router = Router();

const mergeSchema = z.object({
  sourceId: z.string().min(1, 'شناسه مبدأ الزامی است'),
  targetId: z.string().min(1, 'شناسه مقصد الزامی است'),
});

// POST /api/v1/merging/farmers
router.post(
  '/farmers',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { sourceId, targetId } = mergeSchema.parse(req.body);
      const result = await mergeFarmers({
        sourceFarmerId: sourceId,
        targetFarmerId: targetId,
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        requestId: req.requestId,
      });

      res.json({
        success: true,
        message: 'ادغام دو مرغدار با موفقیت انجام شد و کلیه سوابق به رکورد مقصد منتقل گردید.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/merging/drivers
router.post(
  '/drivers',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { sourceId, targetId } = mergeSchema.parse(req.body);
      const result = await mergeDrivers({
        sourceDriverId: sourceId,
        targetDriverId: targetId,
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        requestId: req.requestId,
      });

      res.json({
        success: true,
        message: 'ادغام دو راننده با موفقیت انجام شد.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/merging/products
router.post(
  '/products',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { sourceId, targetId } = mergeSchema.parse(req.body);
      const result = await mergeProducts({
        sourceProductId: sourceId,
        targetProductId: targetId,
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        requestId: req.requestId,
      });

      res.json({
        success: true,
        message: 'ادغام اقلام کالا در انبار و کاردکس با موفقیت انجام شد.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
