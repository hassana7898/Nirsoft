import { getDb } from '../../src/db/index.ts';
import { users } from '../../src/db/schema.ts';
import {
  hashPassword,
  createSession,
  validateSession,
  revokeSession,
} from '../../src/server/services/authService.ts';
import crypto from 'crypto';

export async function runAuthIntegrationTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err) });
    }
  }

  const db = await getDb();
  const testUserId = `user_auth_test_${crypto.randomBytes(4).toString('hex')}`;
  const testPhone = `0930${Date.now().toString().slice(-7)}`;
  const rawPass = 'StrongPass#2026';
  const hashed = await hashPassword(rawPass);

  await test('auth: should create user and establish active database session', async () => {
    await db.insert(users).values({
      id: testUserId,
      phoneNumber: testPhone,
      passwordHash: hashed,
      fullName: 'کاربر تستی احراز هویت',
      role: 'MANAGER',
    });

    const { token, expiresAt } = await createSession({
      userId: testUserId,
      userAgent: 'TestRunner/1.0',
      ipAddress: '127.0.0.1',
    });

    if (!token || !expiresAt) throw new Error('Session creation failed');

    const validation = await validateSession(token);
    if (!validation.isValid || !validation.user || validation.user.id !== testUserId) {
      throw new Error('Valid session was not recognized by validateSession');
    }
  });

  await test('auth: should reject invalid or nonexistent session token', async () => {
    const invalidValidation = await validateSession('non_existent_token_hex_1234567890');
    if (invalidValidation.isValid) {
      throw new Error('Invalid token was mistakenly validated as true');
    }
  });

  await test('auth: should revoke session upon logout and subsequently deny access', async () => {
    const { token } = await createSession({ userId: testUserId });
    const checkBefore = await validateSession(token);
    if (!checkBefore.isValid) throw new Error('Session was not active before revocation');

    await revokeSession(token);
    const checkAfter = await validateSession(token);
    if (checkAfter.isValid) {
      throw new Error('Revoked session is still reporting as valid');
    }
  });

  return results;
}
