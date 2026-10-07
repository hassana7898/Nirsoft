import { getDb, initDb, checkDatabaseHealth } from '../../src/db/index.ts';
import { users, farmers, inventoryLedger } from '../../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function runDbIntegrationTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err) });
    }
  }

  await test('db: should initialize schema and pass health check', async () => {
    await initDb();
    const health = await checkDatabaseHealth();
    if (!health.isHealthy) throw new Error(`Database is not healthy: ${health.error}`);
  });

  await test('db: should insert and query a farmer record via Drizzle', async () => {
    const db = await getDb();
    const farmerId = `farmer_test_${crypto.randomBytes(4).toString('hex')}`;
    const code = `F-${Date.now()}`;

    await db.insert(farmers).values({
      id: farmerId,
      code,
      fullName: 'مرغداری آزمایشی نوین',
      phoneNumber: '09121112233',
    });

    const rows = await db.select().from(farmers).where(eq(farmers.id, farmerId));
    if (rows.length === 0 || rows[0].fullName !== 'مرغداری آزمایشی نوین') {
      throw new Error('Farmer record not found or data mismatch');
    }
  });

  await test('db: should enforce unique constraints (e.g. phone number on users)', async () => {
    const db = await getDb();
    const uid1 = `user_uniq_1_${crypto.randomBytes(4).toString('hex')}`;
    const uid2 = `user_uniq_2_${crypto.randomBytes(4).toString('hex')}`;
    const duplicatePhone = `0919999${crypto.randomBytes(2).toString('hex')}`;

    await db.insert(users).values({
      id: uid1,
      phoneNumber: duplicatePhone,
      passwordHash: 'dummy_hash',
      fullName: 'کاربر اول',
      role: 'SCALE_OPERATOR',
    });

    let duplicateFailed = false;
    try {
      await db.insert(users).values({
        id: uid2,
        phoneNumber: duplicatePhone,
        passwordHash: 'dummy_hash',
        fullName: 'کاربر دوم با تلفن تکراری',
        role: 'SCALE_OPERATOR',
      });
    } catch (err) {
      duplicateFailed = true;
    }

    if (!duplicateFailed) {
      throw new Error('Database allowed duplicate unique phone number constraint violation');
    }
  });

  await test('db: transaction rollback should rollback uncommitted changes on error', async () => {
    const db = await getDb();
    const testProductId = 'prod_corn';
    const txnId = `txn_fail_${crypto.randomBytes(4).toString('hex')}`;

    try {
      await db.transaction(async (tx) => {
        await tx.insert(inventoryLedger).values({
          id: txnId,
          transactionDate: '2026-10-07',
          productId: testProductId,
          action: 'PURCHASE_RECEIPT',
          quantityChange: '500.000',
          reason: 'این تراکنش باید رول‌بک شود',
        });

        // Deliberately trigger an error
        throw new Error('Simulated atomic transaction failure');
      });
    } catch (err) {
      // expected error
    }

    // Verify row was rolled back and does not exist in inventory_ledger
    const found = await db.select().from(inventoryLedger).where(eq(inventoryLedger.id, txnId));
    if (found.length > 0) {
      throw new Error('Transaction was not rolled back after error');
    }
  });

  return results;
}
