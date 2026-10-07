import { Router } from 'express';
import { isNull, desc } from 'drizzle-orm';
import { getDb } from '../../db/index.ts';
import {
  farmers,
  flocks,
  products,
  inboundEntries,
  outboundExits,
  inventoryLedger,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.ts';

const router = Router();

// Helper to escape CSV cell content
function toCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// GET /api/v1/excel/export/:entity
router.get('/export/:entity', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { entity } = req.params;
    const db = await getDb();
    let csvContent = '\uFEFF'; // UTF-8 BOM for proper Persian display in Excel

    if (entity === 'inbound') {
      const rows = await db
        .select()
        .from(inboundEntries)
        .where(isNull(inboundEntries.deletedAt))
        .orderBy(desc(inboundEntries.entryDate));

      csvContent += 'شماره قبض,تاریخ,فروشنده,وزن بارنامه (kg),وزن باسکول (kg),کسری (kg),شماره بارنامه,مبدأ,راننده\n';
      rows.forEach((r) => {
        csvContent += [
          toCsvCell(r.entryNumber),
          toCsvCell(r.entryDate),
          toCsvCell(r.sellerName),
          toCsvCell(r.billWeight),
          toCsvCell(r.scaleWeight),
          toCsvCell(r.wastage),
          toCsvCell(r.billNumber),
          toCsvCell(r.origin),
          toCsvCell(r.driverName),
        ].join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="inbound-scale-tickets.csv"');
      return res.send(csvContent);
    }

    if (entity === 'outbound') {
      const rows = await db
        .select()
        .from(outboundExits)
        .where(isNull(outboundExits.deletedAt))
        .orderBy(desc(outboundExits.exitDate));

      csvContent += 'شماره حواله,تاریخ,مرغدار,وزن خالص (kg),راننده,کرامبل\n';
      rows.forEach((r) => {
        csvContent += [
          toCsvCell(r.invoiceNumber),
          toCsvCell(r.exitDate),
          toCsvCell(r.farmerId),
          toCsvCell(r.weight),
          toCsvCell(r.driverName),
          toCsvCell(r.isCrumble ? 'بله' : 'خیر'),
        ].join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="outbound-feed-exits.csv"');
      return res.send(csvContent);
    }

    if (entity === 'farmers') {
      const rows = await db.select().from(farmers).where(isNull(farmers.deletedAt));
      csvContent += 'کد,نام مرغدار,تلفن همراه,کد ملی,آدرس,سقف اعتبار (تومان)\n';
      rows.forEach((r) => {
        csvContent += [
          toCsvCell(r.code),
          toCsvCell(r.fullName),
          toCsvCell(r.phoneNumber),
          toCsvCell(r.nationalId),
          toCsvCell(r.address),
          toCsvCell(r.creditLimit),
        ].join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="farmers-directory.csv"');
      return res.send(csvContent);
    }

    res.status(400).json({ success: false, error: 'موجودیت نامعتبر برای خروجی اکسل' });
  } catch (err) {
    next(err);
  }
});

export default router;
