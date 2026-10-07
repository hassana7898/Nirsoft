# مرجع مهاجرت داده‌ها از سامانه فعلی به جدید (MIGRATION REFERENCE)

این راهنما فرآیند تبدیل داده‌های ساختارنیافته و ذخیره‌شده در `localStorage` یا خروجی‌های JSON سامانه قبلی را به پایگاه داده ساختاریافته رابطه ای **NIRWARE NEXT** تشریح می‌کند.

---

## ۱. نقشه کلیدهای داده در سامانه قبلی (Legacy Keys Mapping)

| کلید در سامانه قدیم | ماهیت داده در سیستم قدیم | جدول هدف در NIRWARE NEXT |
| :--- | :--- | :--- |
| `poultryAppSettings` | لیست محصولات، سهمیه‌ها، امضاها، تنظیمات سربرگ | `products`, `feed_quotas`, `system_settings` |
| `poultryAppFarmers` | مرغداران و دوره‌های پرورش تو در تو | `farmers`, `farms`, `poultry_houses`, `flocks` |
| `poultryAppInvoices` | آرایه ترکیبی فاکتورهای ورود و خروج | `inbound_entries`, `outbound_exits`, `inventory_ledger` |
| `poultryAppFormulas` | فرمول‌های خط تولید دان | `formulas`, `formula_items` |
| `poultryAppProduction` | رکوردهای تولید روزانه | `production_batches`, `inventory_ledger` |
| `poultryAppAdjustments` | اصلاحیه‌های بدون مرجع انبار | `inventory_ledger (ADJUSTMENT)` |
| `poultryAppDrivers` | آرایه ساده اسامی رانندگان | `drivers` |
| `origins` | آرایه رشته‌ای اسامی مبادی بار | `reference_origins` |

---

## ۲. قوانین انتقال و تبدیل داده (Transformation Rules)

### ۲.۱. تفکیک فاکتورهای ترکیبی (Remittances Separation)
در سیستم قدیم، فاکتورهای ورود (`Entry`) و خروج (`Exit`) در یک آرایه مشترک ریخته شده بودند و با بررسی وجود فیلد `sellerName` یا `farmerId` از هم تفکیک می‌شدند.
- **شرط تفکیک:**
  - اگر رکورد دارای فیلد `sellerName` باشد: وارد جدول `inbound_entries` می‌شود و یک رکورد معادل `PURCHASE_RECEIPT` در `inventory_ledger` درج می‌گردد.
  - اگر رکورد دارای فیلد `farmerId` باشد: وارد جدول `outbound_exits` می‌شود و یک رکورد معادل `SALES_DISPATCH` در `inventory_ledger` درج می‌گردد.

### ۲.۲. تبدیل ساختار مرغداران و گله‌ها (Broods Transformation)
در سیستم قدیم:
```json
{
  "id": "farmer_123",
  "name": "حاج احمد حسینی",
  "broods": [
    {
      "id": "brood_1",
      "startDate": "2026-03-01",
      "chickCount": 20000,
      "endDate": "2026-04-20",
      "finalChickenWeight": 54000
    }
  ]
}
```
در سیستم جدید:
1. ابتدا رکورد مرغدار در جدول `farmers` ایجاد می‌شود:
   - `id`: تولید UUID جدید (با نگهداری مپینگ شناسه قدیم).
   - `full_name`: مقدار `"حاج احمد حسینی"`.
2. یک مزرعه پیش‌فرض در جدول `farms` با نام `"مزرعه اصلی"` ایجاد می‌شود.
3. یک سالن پیش‌فرض در جدول `poultry_houses` با عنوان `"سالن شماره ۱"` ایجاد می‌شود.
4. برای هر دوره در آرایه `broods`، یک رکورد در جدول `flocks` ساخته می‌شود:
   - `farmer_id`: شناسه مرغدار.
   - `chick_count`: `20000`.
   - `start_date`: `"2026-03-01"`.
   - `actual_end_date`: `"2026-04-20"`.
   - `final_chicken_weight`: `54000`.
   - `status`: اگر `endDate` دارد `'COMPLETED'`، در غیر این صورت `'ACTIVE'`.

### ۲.۳. انتقال رانندگان و اصلاح ساختار
- آرایه رشته‌ای نام رانندگان خوانده شده و برای هر نام یکتای معتبر، رکوردی در جدول `drivers` با نام راننده ایجاد می‌شود.
- در صورتی که در فاکتورهای ورود شماره تلفن یا شبای راننده ثبت شده باشد، اطلاعات پروفایل راننده بر مبنای آخرین ورود غنی‌سازی می‌شود.

### ۲.۴. انتقال فرمول‌های تولید
فرمول‌های قدیم ساختار زیر را داشتند:
```json
{
  "id": "f_1",
  "finishedGoodId": "broiler_feed",
  "items": [
    { "productId": "corn", "quantity": 0.55 },
    { "productId": "soybean", "quantity": 0.35 },
    { "productId": "concentrate", "quantity": 0.10 }
  ]
}
```
این فرمول‌ها مستقیماً به سربرگ در `formulas` و ردیف‌های متناظر در `formula_items` تبدیل می‌گردند. اعتبارسنجی جمع اقلام ($\sum \text{quantity} = 1.000$) مجدداً چک می‌شود.

---

## ۳. فرآیند مهاجرت امن در ۴ گام (Safe 4-Step Migration Pipeline)

```text
  ┌──────────────────────┐
  │ ۱. Export Legacy JSON│  دریافت فایل پشتیبان کامل یا استخراج از localStorage
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │ ۲. Data Sanitization │  اصلاح فونت‌های فارسی (ي و ك به ی و ک)، حذف رکوردهای خراب
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │ ۳. Dry-Run & Preview │  نمایش گزارش آماری تعداد اقلام و هشدار تداخلات به کاربر
  └──────────┬───────────┘
             ▼
  ┌──────────────────────┐
  │ ۴. Database Insert   │  درج در پایگاه داده جدید در قالب یک Transaction یکپارچه
  └──────────────────────┘
```
