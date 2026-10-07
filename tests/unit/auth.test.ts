import { hashPassword, verifyPassword, generateSessionToken } from '../../src/server/services/authService.ts';

export async function runAuthUnitTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err) });
    }
  }

  await test('hashPassword & verifyPassword: should hash and successfully verify correct password', async () => {
    const rawPass = 'SecretPoultry@2026';
    const hash = await hashPassword(rawPass);
    if (!hash || hash.length < 20) throw new Error('Invalid hash output');

    const isValid = await verifyPassword(rawPass, hash);
    if (!isValid) throw new Error('Password verification failed for valid password');
  });

  await test('verifyPassword: should reject incorrect password', async () => {
    const rawPass = 'SecretPoultry@2026';
    const hash = await hashPassword(rawPass);
    const isValid = await verifyPassword('WrongPassword123', hash);
    if (isValid) throw new Error('Verification passed for wrong password');
  });

  await test('generateSessionToken: should generate secure 64-char hex token', async () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();
    if (token1.length !== 64 || token2.length !== 64) {
      throw new Error(`Token length should be 64 chars, got ${token1.length}`);
    }
    if (token1 === token2) {
      throw new Error('Collision in generated tokens');
    }
  });

  return results;
}
