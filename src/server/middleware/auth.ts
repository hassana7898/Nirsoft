import { Request, Response, NextFunction } from 'express';
import { validateSession } from '../services/authService.ts';
import { users, sessions } from '../../db/schema.ts';

export const SESSION_COOKIE_NAME = 'nirware_session';

export interface AuthenticatedRequest extends Request {
  user?: typeof users.$inferSelect;
  session?: typeof sessions.$inferSelect;
  requestId?: string;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | undefined;

  // 1. Try to read from HttpOnly cookie
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    token = req.cookies[SESSION_COOKIE_NAME];
  }

  // 2. Fallback to Authorization: Bearer <token> (for PWA / mobile API)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    return next();
  }

  try {
    const result = await validateSession(token);
    if (result.isValid && result.user) {
      req.user = result.user;
      req.session = result.session;
    }
  } catch (err) {
    console.error('Error validating session:', err);
  }

  next();
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'برای دسترسی به این بخش، لطفاً ابتدا وارد سامانه شوید.',
        requestId: req.id,
      },
    });
    return;
  }
  next();
}

export function requireRole(...allowedRoles: Array<typeof users.$inferSelect.role>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'نیاز به احراز هویت است.',
          requestId: req.id,
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'شما دسترسی لازم برای انجام این عملیات را ندارید.',
          requestId: req.id,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Object-Level Authorization: Scopes farmer requests to only their own data
 */
export function enforceFarmerScope(req: AuthenticatedRequest, targetFarmerId: string): boolean {
  if (!req.user) return false;
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN' || req.user.role === 'MANAGER') {
    return true;
  }
  if (req.user.role === 'FARMER') {
    return req.user.farmerId === targetFarmerId;
  }
  return false;
}

/**
 * Object-Level Authorization: Scopes driver requests to only their own data
 */
export function enforceDriverScope(req: AuthenticatedRequest, targetDriverId: string): boolean {
  if (!req.user) return false;
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN' || req.user.role === 'MANAGER' || req.user.role === 'SCALE_OPERATOR') {
    return true;
  }
  if (req.user.role === 'DRIVER') {
    return req.user.driverId === targetDriverId;
  }
  return false;
}
