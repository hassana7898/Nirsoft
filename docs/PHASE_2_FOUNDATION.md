# مستندات دستاوردهای فاز ۲ — استقرار زیرساخت و فونداسیون (PHASE 2 FOUNDATION REPORT)

**محصول:** NIRWARE NEXT  
**تاریخ استقرار:** ۷ اکتبر ۲۰۲۶  
**وضعیت:** تکمیل قطعی و تست‌شده (Build = PASS, Tests = 22/22 PASS)

---

## ۱. ساختار ماژولار پیاده‌سازی‌شده (Project Structure & Bounded Contexts)

```text
nirware-next/
├── src/
│   ├── db/
│   │   ├── schema.ts            # اسکیمای ۲۲ جدول رابطه‌ای Drizzle ORM با انوم‌ها و ایندکس‌ها
│   │   └── index.ts             # راه‌انداز پایگاه داده PostgreSQL (PGlite & PG Pool) و DDL
│   ├── domain/
│   │   └── farming/
│   │       └── calculations.ts  # توابع محاسباتی خالص: FCR، سهمیه دان، افت بار، سرانه، BOM
│   ├── server/
│   │   ├── middleware/
│   │   │   ├── auth.ts          # اعتبارسنجی نشست، RBAC و امنیت شیء‌محور (Farmer/Driver Scoping)
│   │   │   ├── errorHandler.ts  # کنترل‌کننده مرکزی خطاها با Envelope استاندارد و پنهان‌سازی جزئیات در Production
│   │   │   ├── rateLimiter.ts   # محدودکننده نرخ درخواست‌ها برای لاگین و API
│   │   │   └── requestId.ts     # تولید و انتشار خودکار x-request-id در هدرها و لاگ‌ها
│   │   ├── routes/
│   │   │   ├── auth.ts          # اندپوینت‌های لاگین، خروج، me، تغییر رمز و مدیریت کوکی HttpOnly
│   │   │   ├── health.ts        # پروب‌های سلامت‌سنجی (/health و /ready)
│   │   │   └── system.ts        # گزارش شاخص‌های فونداسیون و دیتابیس
│   │   ├── seed/
│   │   │   └── seed.ts          # بذر اولیه داده‌های امنیتی، نقش‌ها، محصولات و تنظیمات (بدون پسورد واقعی)
│   │   └── services/
│   │       ├── auditService.ts  # ثبت تغییرناپذیر وقایع حساس در جدول audit_logs
│   │       └── authService.ts   # هش رمز با نمک تصادفی، مدیریت توکن‌های ۶۴ کاراکتری و چرخش نشست
│   ├── App.tsx                  # داشبورد فرانت‌اند مدیریت و اعتبارسنجی فونداسیون فاز ۲
│   ├── main.tsx                 # نقطه ورود کلاینت React 19
│   └── index.css                # استایل‌های Tailwind CSS و تنظیمات راست‌چین (RTL)
├── tests/
│   ├── unit/
│   │   ├── calculations.test.ts # تست‌های واحد محاسبات صنعتی FCR، سهمیه و نرمال‌سازی فارسی
│   │   └── auth.test.ts         # تست‌های واحد هشینگ رمز عبور و تولید توکن‌های نشست
│   ├── integration/
│   │   ├── db.test.ts           # تست یکپارچگی Drizzle، ایجاد جداول، قید یکتایی و رول‌بک ترنزکشن
│   │   └── auth-api.test.ts     # تست چرخه کامل نشست، اعتبارسنجی و ابطال نشست در خروج
│   └── run-tests.ts             # اجراکننده جامع کلیه تست‌های خودکار
├── docs/                        # مجموعه کامل اسناد معماری، امنیت و لاگ تصمیمات
├── server.ts                    # سرور فول‌استک Express + Vite
└── package.json
```

---

## ۲. خلاصه نتایج آزمون‌های خودکار (Automated Test Execution Summary)

اجرای دستور `npm test` (`npx tsx tests/run-tests.ts`) نتایج زیر را ارائه داد:

```text
====================================================
🧪 NIRWARE NEXT — Foundation Automated Test Suite
====================================================

▶ Running Unit Tests: Industrial Calculations (FCR, Quota, BOM, Wastage)...
  ✅ PASS: calculateWastage: should calculate negative loss correctly (scale < bill)
  ✅ PASS: calculateWastage: should calculate zero loss correctly
  ✅ PASS: calculateFeedQuota: should calculate 600g quota for 20,000 chicks as 12,000 kg
  ✅ PASS: calculateFeedQuota: should return 0 for non-positive chick count
  ✅ PASS: calculateFCR: should calculate 1.650 for 90,750 kg feed and 55,000 kg live weight
  ✅ PASS: calculateFCR: should return null when live weight is 0 or unrecorded
  ✅ PASS: calculatePerCapita: should calculate 4500g per chick for 90,000 kg feed and 20,000 chicks
  ✅ PASS: calculateFlockDuration: should return correct day count inclusive
  ✅ PASS: validateFormulaBalance: should validate balanced 1000 kg recipe
  ✅ PASS: validateFormulaBalance: should detect unbalanced recipe
  ✅ PASS: normalizePersianDigits: should convert Persian and Arabic numerals to ASCII
  ✅ PASS: normalizePersianText: should convert Arabic yeh/kaf to Persian ی/ک

▶ Running Unit Tests: Password Hashing & Token Generation...
  ✅ PASS: hashPassword & verifyPassword: should hash and successfully verify correct password
  ✅ PASS: verifyPassword: should reject incorrect password
  ✅ PASS: generateSessionToken: should generate secure 64-char hex token

▶ Running Integration Tests: PostgreSQL Schema, DDL & Transactions...
  ✅ PASS: db: should initialize schema and pass health check
  ✅ PASS: db: should insert and query a farmer record via Drizzle
  ✅ PASS: db: should enforce unique constraints (e.g. phone number on users)
  ✅ PASS: db: transaction rollback should rollback uncommitted changes on error

▶ Running Integration Tests: Authentication & Session Lifecycle...
  ✅ PASS: auth: should create user and establish active database session
  ✅ PASS: auth: should reject invalid or nonexistent session token
  ✅ PASS: auth: should revoke session upon logout and subsequently deny access

====================================================
📊 Test Summary: 22/22 Passed (0 Failed)
====================================================
✨ ALL PHASE 2 FOUNDATION TESTS PASSED CLEANLY!
```

---

## ۳. امنیت، کنترل دسترسی و جداسازی دامنه‌ها
1. **امنیت رمز عبور:** هیچ کلمه عبور پیش‌فرض تولیدی در سورس کد نگهداری نمی‌شود.
2. **نشست‌های سروری:** نشست‌ها در جدول `sessions` در پایگاه داده ثبت شده و شناسه آنها در کوکی `HttpOnly` با پرچم `SameSite` ذخیره می‌گردد.
3. **دفترکل تغییرناپذیر انبار:** جدول `inventory_ledger` آماده دریافت کلیه تراکنش‌های افزایشی و کاهشی انبار است و هرگونه تغییر مستقیم غیرمجاز است.
4. **تضمین سلامت سرویس:** اندپوینت‌های `/api/v1/health` و `/api/v1/ready` سلامت پایگاه داده و پروسس را کنترل می‌کنند.
