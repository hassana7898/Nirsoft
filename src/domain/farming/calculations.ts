/**
 * NIRWARE NEXT — Core Industrial Farming Domain Calculations
 * All formulas are pure functions, strictly validated and unit-tested.
 */

/**
 * Normalizes Persian/Arabic digits to ASCII 0-9
 */
export function normalizePersianDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = input.toString();
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(persianDigits[i], 'g'), i.toString());
    result = result.replace(new RegExp(arabicDigits[i], 'g'), i.toString());
  }
  return result;
}

/**
 * Normalizes Persian characters: ي -> ی and ك -> ک
 */
export function normalizePersianText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim();
}

/**
 * Inbound scale wastage / loss calculation:
 * Wastage = Scale Weight - Bill Weight
 * Negative value indicates loss during transit.
 */
export function calculateWastage(scaleWeightKg: number, billWeightKg: number): number {
  const scale = Number(scaleWeightKg) || 0;
  const bill = Number(billWeightKg) || 0;
  return Number((scale - bill).toFixed(3));
}

/**
 * Feed quota for a flock:
 * Quota (kg) = (Quota per chick in grams * chick count) / 1000
 */
export function calculateFeedQuota(quotaPerChickGrams: number, chickCount: number): number {
  if (quotaPerChickGrams < 0 || chickCount <= 0) return 0;
  const quotaKg = (quotaPerChickGrams * chickCount) / 1000;
  return Number(quotaKg.toFixed(3));
}

/**
 * Feed Conversion Ratio (FCR / ضریب تبدیل غذایی):
 * FCR = Total Feed Consumed (kg) / Total Live Chicken Weight (kg)
 * Returns null if finalChickenWeight is zero or undefined (flock not finished yet).
 */
export function calculateFCR(totalFeedKg: number, finalLiveChickenWeightKg: number | null | undefined): number | null {
  if (!finalLiveChickenWeightKg || finalLiveChickenWeightKg <= 0 || totalFeedKg <= 0) {
    return null;
  }
  return Number((totalFeedKg / finalLiveChickenWeightKg).toFixed(3));
}

/**
 * Per capita feed consumption (مصرف سرانه به گرم):
 * Per Capita (grams/bird) = (Total Feed in kg * 1000) / Chick Count
 */
export function calculatePerCapita(totalFeedKg: number, chickCount: number): number {
  if (chickCount <= 0 || totalFeedKg <= 0) return 0;
  return Math.round((totalFeedKg * 1000) / chickCount);
}

/**
 * Flock duration in days:
 * Date difference + 1 day inclusive
 */
export function calculateFlockDuration(startDateStr: string, endDateStr?: string | null): number {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr);
  const end = endDateStr ? new Date(endDateStr) : new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays) + 1;
}

/**
 * Validates Bill of Materials (BOM) balance for 1000 kg batch
 * Sum of ingredient quantities must equal exactly batch basis (default 1000 kg, tolerance 0.01 kg).
 */
export function validateFormulaBalance(items: { rawMaterialId: string; quantityKg: number }[], batchBasisKg = 1000): {
  isValid: boolean;
  totalQuantityKg: number;
  differenceKg: number;
} {
  const total = items.reduce((sum, item) => sum + (Number(item.quantityKg) || 0), 0);
  const diff = Number((total - batchBasisKg).toFixed(4));
  const isValid = Math.abs(diff) <= 0.01;
  return {
    isValid,
    totalQuantityKg: Number(total.toFixed(4)),
    differenceKg: diff,
  };
}
