import crypto from 'crypto';
import { getDb } from '../../db/index.ts';
import { auditLogs } from '../../db/schema.ts';

export interface AuditEventParams {
  userId?: string | null;
  userPhone?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldState?: any;
  newState?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const db = await getDb();
    const id = `audit_${crypto.randomBytes(12).toString('hex')}`;

    await db.insert(auditLogs).values({
      id,
      userId: params.userId || null,
      userPhone: params.userPhone || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      oldState: params.oldState ? JSON.stringify(params.oldState) : null,
      newState: params.newState ? JSON.stringify(params.newState) : null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      requestId: params.requestId || null,
    });
  } catch (err) {
    // Audit log failures must be logged to stderr but not crash core workflow
    console.error('Failed to write audit log:', err);
  }
}
