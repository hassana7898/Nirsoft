# سند استقرار و مدیریت محیط عملیاتی (DEPLOYMENT & DEVOPS)

این سند فرآیند استقرار، پیکربندی متغیرهای محیطی، بررسی سلامت سرویس، و رویه‌های پشتیبان‌گیری **NIRWARE NEXT** را در محیط‌های Production تشریح می‌کند.

---

## ۱. متغیرهای محیطی مورد نیاز (Environment Variables)

کلیه متغیرهای محیطی در فایل `.env.example` مستند شده و هیچ کلید محرمانه‌ای در سورس کد قرار نمی‌گیرد:

```bash
# پورت اجرای وب‌سرور
PORT=3000
NODE_ENV=production

# آدرس اتصال به پایگاه داده رابطه ای PostgreSQL
DATABASE_URL=postgresql://nirware_user:StrongPasswordHere@localhost:5432/nirware_next?sslmode=prefer

# کلید رمزنگاری نشست‌ها و هش‌ها
SESSION_SECRET=a_very_long_random_secure_hex_secret_key_minimum_64_chars

# کلید هوش مصنوعی Google Gemini جهت استخراج بارنامه‌ها
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere

# آدرس پایه دامنه برنامه جهت سیاست‌های CORS و کوکی
APP_URL=https://app.nirware.ir
```

---

## ۲. بررسی سلامت سرویس (Health & Readiness Probes)

سرویس دارای دو اندپوینت استاندارد جهت بررسی سلامت توسط پلتفرم‌های مانیتورینگ و کانتینری است:
- **`GET /api/v1/health` (Liveness):** بررسی فعال بودن پردازش Node.js (پاسخ سریع `200 OK`).
- **`GET /api/v1/ready` (Readiness):** بررسی برقراری موفقیت‌آمیز ارتباط با پایگاه داده PostgreSQL (اجرای یک کوئری ساده `SELECT 1`). در صورت قطعی اتصال دیتابیس، پاسخ `503 Service Unavailable` بازگردانده می‌شود.

---

## ۳. فرآیند ساخت و اجرای نسخه عملیاتی (Build & Run Pipeline)

```bash
# ۱. نصب وابستگی‌های برنامه
npm install

# ۲. اجرای مایگریشن‌های اسکیما روی دیتابیس PostgreSQL
npm run db:migrate

# ۳. درج داده‌های پایه اولیه (محصولات، سهمیه‌ها، نقش‌ها)
npm run db:seed

# ۴. کامپایل و بیلد باندل کلاینت و سرور
npm run build

# ۵. اجرای سرویس نهایی
npm run start
```

---

## ۴. استراتژی پشتیبان‌گیری و بازگردانی پایگاه داده (Backup & Restore Strategy)

### ۴.۱. پشتیبان‌گیری خودکار روزانه
- تهیه بک‌آپ متوالی به کمک ابزار استاندارد `pg_dump`:
```bash
pg_dump -U nirware_user -d nirware_next -F c -b -v -f /backups/nirware_$(date +%Y%m%d_%H%M%S).dump
```
- نگهداری حداقل ۳۰ نسخه روزانه به همراه ارسال به فضای ذخیره‌سازی ابری امن (Offsite S3-compatible storage).

### ۴.۲. دستورالعمل بازگردانی (Disaster Recovery Restore)
```bash
pg_restore -U nirware_user -d nirware_next -v /backups/nirware_target_backup.dump
```
