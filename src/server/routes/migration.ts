import { Router } from 'express';
import crypto from 'crypto';
import { eq, isNull } from 'drizzle-orm';
import { getDb } from '../../db/index.ts';
import {
  farmers,
  flocks,
  products,
  inboundEntries,
  outboundExits,
  inventoryLedger,
  productionBatches,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';
import { logAuditEvent } from '../services/auditService.ts';

const router = Router();

// POST /api/v1/migration/import-legacy
router.post(
  '/import-legacy',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const payload = req.body;
      const db = await getDb();

      let importedFarmers = 0;
      let importedFlocks = 0;
      let importedInbound = 0;
      let importedOutbound = 0;

      // 1. Process Farmers
      if (Array.isArray(payload.poultryAppFarmers) || Array.isArray(payload.farmers)) {
        const rawFarmers = payload.poultryAppFarmers || payload.farmers || [];
        for (const rf of rawFarmers) {
          const farmerName = rf.fullName || rf.name || rf.farmerName;
          if (!farmerName) continue;

          const farmerId = rf.id || crypto.randomUUID();
          await db
            .insert(farmers)
            .values({
              id: farmerId,
              fullName: farmerName,
              phoneNumber: rf.phoneNumber || rf.phone || null,
              address: rf.address || null,
              nationalId: rf.nationalId || null,
            })
            .onConflictDoNothing();
          importedFarmers++;

          // Nested broods / flocks in legacy farmer
          if (Array.isArray(rf.broods)) {
            for (const b of rf.broods) {
              const flockId = b.id || crypto.randomUUID();
              await db
                .insert(flocks)
                .values({
                  id: flockId,
                  farmerId,
                  flockCode: b.name || b.flockCode || 'دوره انتقالی',
                  chickCount: parseInt(b.chickCount || b.count || '0', 10) || 10000,
                  startDate: b.startDate || new Date().toISOString().slice(0, 10),
                  expectedEndDate: b.expectedEndDate || null,
                  actualEndDate: b.actualEndDate || null,
                  finalChickenWeight: (b.finalWeight || b.finalChickenWeight || 0).toString(),
                  status: b.isArchived || b.isSettled ? 'COMPLETED' : 'ACTIVE',
                })
                .onConflictDoNothing();
              importedFlocks++;
            }
          }
        }
      }

      // 2. Process Invoices (Inbound and Outbound)
      if (Array.isArray(payload.poultryAppInvoices) || Array.isArray(payload.invoices)) {
        const rawInvoices = payload.poultryAppInvoices || payload.invoices || [];
        for (const inv of rawInvoices) {
          if (inv.type === 'entry' || inv.sellerName) {
            // Inbound
            const id = inv.id || crypto.randomUUID();
            const billWeight = parseFloat(inv.billWeight || inv.originWeight || '0') || 0;
            const scaleWeight = parseFloat(inv.scaleWeight || inv.destinationWeight || '0') || 0;
            const wastage = scaleWeight - billWeight;

            // Ensure a default raw material exists if needed
            let prodId = inv.productId;
            if (!prodId) {
              const existingProds = await db.select().from(products).where(eq(products.type, 'RAW_MATERIAL')).limit(1);
              prodId = existingProds[0]?.id || 'prod_corn';
            }

            await db
              .insert(inboundEntries)
              .values({
                id,
                entryNumber: inv.entryNumber || `LEG-IN-${Date.now().toString().slice(-6)}`,
                entryDate: inv.date || inv.entryDate || new Date().toISOString().slice(0, 10),
                sellerName: inv.sellerName || inv.origin || 'فروشنده نامشخص',
                productId: prodId,
                billWeight: billWeight.toString(),
                scaleWeight: scaleWeight.toString(),
                wastage: wastage.toString(),
                driverName: inv.driverName || null,
                origin: inv.origin || null,
              })
              .onConflictDoNothing();
            importedInbound++;
          } else if (inv.type === 'exit' || inv.farmerName || inv.farmerId) {
            // Outbound
            const id = inv.id || crypto.randomUUID();
            const weight = parseFloat(inv.weight || inv.quantity || '0') || 0;

            let farmerId = inv.farmerId;
            if (!farmerId) {
              const allF = await db.select().from(farmers).limit(1);
              farmerId = allF[0]?.id;
            }

            let prodId = inv.productId;
            if (!prodId) {
              const existingProds = await db.select().from(products).where(eq(products.type, 'FINISHED_GOOD')).limit(1);
              prodId = existingProds[0]?.id || 'prod_starter';
            }

            if (farmerId && prodId) {
              await db
                .insert(outboundExits)
                .values({
                  id,
                  invoiceNumber: inv.invoiceNumber || `LEG-OUT-${Date.now().toString().slice(-6)}`,
                  exitDate: inv.date || inv.exitDate || new Date().toISOString().slice(0, 10),
                  farmerId,
                  productId: prodId,
                  weight: weight.toString(),
                  driverName: inv.driverName || null,
                })
                .onConflictDoNothing();
              importedOutbound++;
            }
          }
        }
      }

      await logAuditEvent({
        userId: req.user?.id,
        userPhone: req.user?.phoneNumber,
        action: 'IMPORT_LEGACY_DATA',
        entityType: 'migration',
        entityId: 'legacy_import',
        newState: { importedFarmers, importedFlocks, importedInbound, importedOutbound },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      res.json({
        success: true,
        message: 'داده‌های سامانه قدیمی با موفقیت تحلیل و وارد پایگاه داده شد',
        summary: {
          importedFarmers,
          importedFlocks,
          importedInbound,
          importedOutbound,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/migration/export-backup
router.get(
  '/export-backup',
  requireAuth,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  async (req, res, next) => {
    try {
      const db = await getDb();
      const allFarmers = await db.select().from(farmers).where(isNull(farmers.deletedAt));
      const allFlocks = await db.select().from(flocks).where(isNull(flocks.deletedAt));
      const allProducts = await db.select().from(products).where(isNull(products.deletedAt));
      const allInbound = await db.select().from(inboundEntries).where(isNull(inboundEntries.deletedAt));
      const allOutbound = await db.select().from(outboundExits).where(isNull(outboundExits.deletedAt));
      const allBatches = await db.select().from(productionBatches);

      res.json({
        success: true,
        exportTimestamp: new Date().toISOString(),
        version: 'NIRWARE-NEXT-v1.0.0',
        data: {
          farmers: allFarmers,
          flocks: allFlocks,
          products: allProducts,
          inboundEntries: allInbound,
          outboundExits: allOutbound,
          productionBatches: allBatches,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
