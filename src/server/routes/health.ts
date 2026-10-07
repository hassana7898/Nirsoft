import { Router } from 'express';
import { checkDatabaseHealth } from '../../db/index.ts';

const router = Router();

// Liveness probe
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      service: 'NIRWARE NEXT Backend API',
    },
    meta: {
      requestId: req.id,
    },
  });
});

// Readiness probe (verifies database dependency)
router.get('/ready', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();

  if (!dbHealth.isHealthy) {
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'پایگاه داده در دسترس نیست یا در حال راه‌اندازی است.',
        details: dbHealth,
        requestId: req.id,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      status: 'READY',
      database: dbHealth,
      timestamp: new Date().toISOString(),
    },
    meta: {
      requestId: req.id,
    },
  });
});

export default router;
