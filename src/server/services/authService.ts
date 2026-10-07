import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { getDb } from '../../db/index.ts';
import { users, sessions } from '../../db/schema.ts';

const BCRYPT_SALT_ROUNDS = 12;
const SESSION_DURATION_HOURS = 24 * 7; // 7 days

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(plainPassword, salt);
}

export async function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function createSession(options: {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  const sessionId = `sess_${crypto.randomBytes(12).toString('hex')}`;

  await db.insert(sessions).values({
    id: sessionId,
    userId: options.userId,
    token: tokenHash,
    userAgent: options.userAgent || null,
    ipAddress: options.ipAddress || null,
    expiresAt,
  });

  return { token: rawToken, expiresAt };
}

export async function validateSession(rawToken: string): Promise<{
  isValid: boolean;
  user?: typeof users.$inferSelect;
  session?: typeof sessions.$inferSelect;
}> {
  if (!rawToken) return { isValid: false };

  const db = await getDb();
  const now = new Date();
  const tokenHash = hashToken(rawToken);

  const foundSessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.token, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now)
      )
    );

  if (foundSessions.length === 0) {
    return { isValid: false };
  }

  const session = foundSessions[0];
  const foundUsers = await db.select().from(users).where(eq(users.id, session.userId));

  if (foundUsers.length === 0 || !foundUsers[0].isActive || foundUsers[0].deletedAt) {
    return { isValid: false };
  }

  return { isValid: true, user: foundUsers[0], session };
}

export async function revokeSession(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const db = await getDb();
  const now = new Date();
  const tokenHash = hashToken(rawToken);

  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(eq(sessions.token, tokenHash));

  return true;
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  const db = await getDb();
  const now = new Date();

  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
