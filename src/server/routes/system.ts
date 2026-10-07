import { Router } from 'express';
import { checkDatabaseHealth, getDb } from '../../db/index.ts';
import { users, products, feedOrders, inventoryLedger } from '../../db/schema.ts';
import { count } from 'drizzle-orm';

const router = Router();

router.get('/foundation-status', async (req, res, next) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const db = await getDb();

    // Query foundation metrics from PostgreSQL
    const [userCount] = await db.select({ val: count() }).from(users);
    const [productCount] = await db.select({ val: count() }).from(products);
    const [orderCount] = await db.select({ val: count() }).from(feedOrders);
    const [ledgerCount] = await db.select({ val: count() }).from(inventoryLedger);

    res.status(200).json({
      success: true,
      data: {
        productName: 'NIRWARE NEXT',
        version: '2.0.0-foundation',
        architecture: 'Modular Monolith (Production Grade)',
        database: {
          ...dbHealth,
          schemaVersion: 'v1.0.0',
          totalTables: 28,
          counts: {
            users: Number(userCount?.val || 0),
            products: Number(productCount?.val || 0),
            orders: Number(orderCount?.val || 0),
            ledgerTransactions: Number(ledgerCount?.val || 0),
          },
        },
        security: {
          passwordHash: 'Argon2id (Production Default) / Bcrypt with Salt',
          sessions: 'Database-backed Server Sessions + HttpOnly Cookie + SHA-256 Token Hashing',
          rbac: 'Active (10 Canonical Roles Defined)',
          objectLevelAuthorization: 'Active',
          rateLimiting: 'Active',
          csrfProtection: 'Active',
          requestId: req.id,
        },
        domains: [
          'Auth & Security',
          'Farmers & Farming',
          'Catalog & Products',
          'Feed Orders & State Machine',
          'Production & BOM',
          'Immutable Inventory Ledger',
          'Logistics & Deliveries',
          'Audit Logging',
        ],
      },
      meta: {
        requestId: req.id,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
