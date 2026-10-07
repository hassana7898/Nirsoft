import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitStore>();

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const { windowMs, max, message = 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه بعد تلاش کنید.' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}_${clientIp}`;
    const now = Date.now();

    let entry = memoryStore.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      memoryStore.set(key, entry);
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          requestId: req.id,
        },
      });
      return;
    }

    next();
  };
}

// Pre-configured rate limiters
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: 'تعداد تلاش‌های ناموفق ورود بیش از حد مجاز است. لطفاً ۱۵ دقیقه دیگر تلاش کنید.',
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
});
