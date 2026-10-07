import {
  calculateWastage,
  calculateFeedQuota,
  calculateFCR,
  calculatePerCapita,
  calculateFlockDuration,
  validateFormulaBalance,
  normalizePersianDigits,
  normalizePersianText,
} from '../../src/domain/farming/calculations.ts';

export async function runCalculationsTests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err) });
    }
  }

  // 1. Wastage
  test('calculateWastage: should calculate negative loss correctly (scale < bill)', () => {
    const wastage = calculateWastage(24800, 25000);
    if (wastage !== -200) throw new Error(`Expected -200, got ${wastage}`);
  });

  test('calculateWastage: should calculate zero loss correctly', () => {
    const wastage = calculateWastage(25000, 25000);
    if (wastage !== 0) throw new Error(`Expected 0, got ${wastage}`);
  });

  // 2. Feed Quota
  test('calculateFeedQuota: should calculate 600g quota for 20,000 chicks as 12,000 kg', () => {
    const quota = calculateFeedQuota(600, 20000);
    if (quota !== 12000) throw new Error(`Expected 12000, got ${quota}`);
  });

  test('calculateFeedQuota: should return 0 for non-positive chick count', () => {
    const quota = calculateFeedQuota(600, 0);
    if (quota !== 0) throw new Error(`Expected 0, got ${quota}`);
  });

  // 3. FCR
  test('calculateFCR: should calculate 1.650 for 90,750 kg feed and 55,000 kg live weight', () => {
    const fcr = calculateFCR(90750, 55000);
    if (fcr !== 1.65) throw new Error(`Expected 1.65, got ${fcr}`);
  });

  test('calculateFCR: should return null when live weight is 0 or unrecorded', () => {
    const fcr = calculateFCR(90750, 0);
    if (fcr !== null) throw new Error(`Expected null, got ${fcr}`);
  });

  // 4. Per Capita
  test('calculatePerCapita: should calculate 4500g per chick for 90,000 kg feed and 20,000 chicks', () => {
    const perCapita = calculatePerCapita(90000, 20000);
    if (perCapita !== 4500) throw new Error(`Expected 4500, got ${perCapita}`);
  });

  // 5. Flock Duration
  test('calculateFlockDuration: should return correct day count inclusive', () => {
    const days = calculateFlockDuration('2026-03-01', '2026-03-10');
    if (days !== 10) throw new Error(`Expected 10, got ${days}`);
  });

  // 6. Formula Balance
  test('validateFormulaBalance: should validate balanced 1000 kg recipe', () => {
    const items = [
      { rawMaterialId: 'corn', quantityKg: 550 },
      { rawMaterialId: 'soy', quantityKg: 350 },
      { rawMaterialId: 'conc', quantityKg: 100 },
    ];
    const res = validateFormulaBalance(items);
    if (!res.isValid || res.totalQuantityKg !== 1000) {
      throw new Error(`Expected valid 1000kg formula, got ${JSON.stringify(res)}`);
    }
  });

  test('validateFormulaBalance: should detect unbalanced recipe', () => {
    const items = [
      { rawMaterialId: 'corn', quantityKg: 550 },
      { rawMaterialId: 'soy', quantityKg: 300 },
    ];
    const res = validateFormulaBalance(items);
    if (res.isValid || res.differenceKg !== -150) {
      throw new Error(`Expected invalid recipe with diff -150, got ${JSON.stringify(res)}`);
    }
  });

  // 7. Persian Normalization
  test('normalizePersianDigits: should convert Persian and Arabic numerals to ASCII', () => {
    const converted = normalizePersianDigits('۰۹۱۲۳۴۵۶۷۸۹ و ٠١٢٣٤٥٦٧٨٩');
    if (!converted.includes('09123456789') || !converted.includes('0123456789')) {
      throw new Error(`Expected converted digits, got: ${converted}`);
    }
  });

  test('normalizePersianText: should convert Arabic yeh/kaf to Persian ی/ک', () => {
    const converted = normalizePersianText('كاركرد مرغداري');
    if (converted !== 'کارکرد مرغداری') {
      throw new Error(`Expected "کارکرد مرغداری", got "${converted}"`);
    }
  });

  return results;
}
