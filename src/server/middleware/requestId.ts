import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers['x-request-id'];
  const requestId = typeof incomingId === 'string' && incomingId.length > 0 
    ? incomingId 
    : `req_${crypto.randomBytes(8).toString('hex')}`;

  req.id = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}
