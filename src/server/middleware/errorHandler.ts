import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const requestId = req.id || 'req_unknown';
  const isProduction = process.env.NODE_ENV === 'production';

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'اطلاعات ارسالی با قوانین اعتبارسنجی مطابقت ندارد.',
        details: err.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
        requestId,
      },
    });
    return;
  }

  // Handle custom application errors
  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const errorCode = err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 403 ? 'FORBIDDEN' : statusCode === 401 ? 'UNAUTHORIZED' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'خطای غیرمنتظره‌ای در سرور رخ داد.';

  if (statusCode >= 500) {
    console.error(`[Error ${requestId}] ${req.method} ${req.url}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      details: isProduction ? undefined : err.details,
      requestId,
    },
  });
}
