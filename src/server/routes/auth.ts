import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.ts';
import { users } from '../../db/schema.ts';
import {
  verifyPassword,
  createSession,
  revokeSession,
  hashPassword,
} from '../services/authService.ts';
import {
  AuthenticatedRequest,
  SESSION_COOKIE_NAME,
  requireAuth,
} from '../middleware/auth.ts';
import { loginRateLimiter } from '../middleware/rateLimiter.ts';
import { logAuditEvent } from '../services/auditService.ts';
import { normalizePersianDigits } from '../../domain/farming/calculations.ts';

const router = Router();

const loginSchema = z.object({
  phoneNumber: z.string().min(10, 'شماره تلفن نامعتبر است'),
  password: z.string().min(6, 'رمز عبور حداقل باید ۶ کاراکتر باشد'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'رمز عبور فعلی الزامی است'),
  newPassword: z.string().min(8, 'رمز عبور جدید باید حداقل ۸ کاراکتر باشد'),
});

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    expires: expiresAt,
    path: '/',
  });
}

// POST /api/v1/auth/login
router.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
    const rawBody = req.body;
    const normalizedPhone = normalizePersianDigits(rawBody?.phoneNumber);
    const validated = loginSchema.parse({
      phoneNumber: normalizedPhone,
      password: rawBody?.password,
    });

    const db = await getDb();
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.phoneNumber, validated.phoneNumber));

    if (foundUsers.length === 0) {
      await logAuditEvent({
        action: 'LOGIN_FAILED',
        entityType: 'users',
        userPhone: validated.phoneNumber,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'شماره تلفن یا رمز عبور اشتباه است.',
          requestId: req.id,
        },
      });
      return;
    }

    const user = foundUsers[0];

    if (!user.isActive || user.deletedAt) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'حساب کاربری شما غیرفعال شده است. لطفاً با مدیریت تماس بگیرید.',
          requestId: req.id,
        },
      });
      return;
    }

    const isMatch = await verifyPassword(validated.password, user.passwordHash);
    if (!isMatch) {
      await logAuditEvent({
        userId: user.id,
        userPhone: user.phoneNumber,
        action: 'LOGIN_FAILED_WRONG_PASSWORD',
        entityType: 'users',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id,
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'شماره تلفن یا رمز عبور اشتباه است.',
          requestId: req.id,
        },
      });
      return;
    }

    // Create session in database
    const { token, expiresAt } = await createSession({
      userId: user.id,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Update last login timestamp
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Set secure HttpOnly cookie
    setSessionCookie(res, token, expiresAt);

    await logAuditEvent({
      userId: user.id,
      userPhone: user.phoneNumber,
      action: 'LOGIN_SUCCESS',
      entityType: 'users',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    });

    // Return sanitized user object (never passwordHash)
    res.status(200).json({
      success: true,
      data: {
        token, // provided for PWA / Bearer storage
        user: {
          id: user.id,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          role: user.role,
          farmerId: user.farmerId,
          driverId: user.driverId,
        },
      },
      meta: {
        requestId: req.id,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', async (req: AuthenticatedRequest, res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME] || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      await revokeSession(token);
    }

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });

    if (req.user) {
      await logAuditEvent({
        userId: req.user.id,
        userPhone: req.user.phoneNumber,
        action: 'LOGOUT',
        entityType: 'users',
        entityId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.id,
      });
    }

    res.status(200).json({
      success: true,
      data: { message: 'خروج با موفقیت انجام شد.' },
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.status(200).json({
    success: true,
    data: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      role: user.role,
      farmerId: user.farmerId,
      driverId: user.driverId,
      createdAt: user.createdAt,
    },
    meta: { requestId: req.id },
  });
});

// POST /api/v1/auth/change-password
router.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = req.user!;
    const validated = changePasswordSchema.parse(req.body);

    const isMatch = await verifyPassword(validated.currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CURRENT_PASSWORD_INCORRECT',
          message: 'رمز عبور فعلی وارد شده نادرست است.',
          requestId: req.id,
        },
      });
      return;
    }

    const newHash = await hashPassword(validated.newPassword);
    const db = await getDb();

    await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, user.id));

    await logAuditEvent({
      userId: user.id,
      userPhone: user.phoneNumber,
      action: 'PASSWORD_CHANGED',
      entityType: 'users',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.id,
    });

    res.status(200).json({
      success: true,
      data: { message: 'رمز عبور با موفقیت به‌روزرسانی شد.' },
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
