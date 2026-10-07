# سند طراحی و قرارداد وب‌سرویس‌ها (API DESIGN CONTRACT — v1)

کلیه ارتباطات بین کلاینت و سرور از طریق مسیر `/api/v1` و در قالب پروتکل RESTful استاندارد با تبادل JSON صورت می‌پذیرد.

---

## ۱. ساختار استاندارد پاسخ‌ها و خطاها (Response Envelope & Error Format)

### ۱.۱. پاسخ موفقیت‌آمیز (Standard Success Envelope)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_01hxyz123",
    "timestamp": "2026-10-07T07:15:00.000Z",
    "page": 1,
    "limit": 20,
    "total": 145
  }
}
```

### ۱.۲. پاسخ خطا (Standard Error Envelope)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "تغییر وضعیت از 'DRAFT' به 'PICKED_UP' مجاز نیست.",
    "details": [
      {
        "field": "status",
        "issue": "State must be 'APPROVED' before scheduling"
      }
    ],
    "requestId": "req_01hxyz123"
  }
}
```

### ۱.۳. کدهای وضعیت و خطای استاندارد HTTP
- `200 OK`: واکشی و پردازش موفق
- `201 Created`: ثبت با موفقیت موجودیت جدید
- `400 Bad Request`: اعتبارسنجی ناموفق بدنه درخواست (Zod validation failure)
- `401 Unauthorized`: نشست منقضی شده یا کاربر احراز هویت نشده
- `403 Forbidden`: عدم کفایت مجوز نقش (RBAC) یا عدم مالکیت شیء (Object-Level Authorization)
- `404 Not Found`: موجودیت درخواستی یافت نشد
- `409 Conflict`: تداخل همزمانی یا شماره سند تکراری
- `422 Unprocessable Entity`: نقض قوانین دامنه (مثلاً تجاوز از سهمیه مجاز)
- `500 Internal Server Error`: خطای پیش‌بینی نشده سرور (با لاگ ممیزی کامل)

---

## ۲. مسیرهای احراز هویت و امنیت (Authentication: `/api/v1/auth`)

| متد | مسیر | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | ورود با شماره موبایل و رمز عبور؛ ایجاد نشست سروری و کوکی امن HttpOnly |
| `POST` | `/auth/logout` | Authenticated | ابطال نشست در سرور و پاک‌سازی کوکی نشست |
| `GET` | `/auth/me` | Authenticated | دریافت اطلاعات کاربر جاری، نقش، مرغداری متصل یا پروفایل راننده |
| `POST` | `/auth/change-password` | Authenticated | تغییر رمز عبور با اعتبارسنجی رمز جاری |

---

## ۳. مسیرهای مرغداران و گله‌ها (Farming: `/api/v1/farming`)

| متد | مسیر | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `GET` | `/farmers` | Managers / Scale | دریافت فهرست مرغداران (با پشتیبانی از سرچ و صفحه‌بندی) |
| `POST` | `/farmers` | Managers | ثبت مرغدار جدید |
| `GET` | `/farmers/:id` | Managers / Owner | جزئیات مرغدار، مزارع، سالن‌ها و گله‌ها |
| `PUT` | `/farmers/:id` | Managers | ویرایش اطلاعات مرغدار |
| `POST` | `/farmers/merge` | Super Admin | ادغام دو مرغدار و انتقال کلیه گله‌ها و حواله‌ها |
| `GET` | `/flocks` | Authenticated | فهرست گله‌ها (فیلتر خودکار بر اساس مالکیت مرغدار) |
| `POST` | `/flocks` | Managers / Farmer | ثبت گله جدید (جوجه‌ریزی، نژاد، تعداد قطعه، تاریخ شروع) |
| `GET` | `/flocks/:id` | Authenticated | جزئیات گله، سن، سهمیه‌ها، مانده مصرفی و FCR |
| `PUT` | `/flocks/:id` | Managers / Farmer | ویرایش اطلاعات گله یا پایان دوره (ثبت وزن زنده کشتار) |
| `POST` | `/flocks/:id/daily-records` | Managers / Farmer | ثبت اطلاعات روزانه گله (تلفات، دان، آب، میانگین وزن) |
| `POST` | `/flocks/:id/exceptional-feed`| Managers | ثبت دان استثنایی با ذکر دلیل و تاریخ |

---

## ۴. مسیرهای کاتالوگ و فرمول‌ها (Catalog: `/api/v1/catalog`)

| متد | مسیر | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Authenticated | لیست کلیه مواد اولیه و محصولات نهایی فعال |
| `POST` | `/products` | Managers | تعریف محصول جدید |
| `PUT` | `/products/:id` | Managers | ویرایش اطلاعات یا قیمت پایه محصول |
| `POST` | `/products/merge` | Super Admin | ادغام دو محصول تکراری در کل فاکتورها و فرمول‌ها |
| `GET` | `/quotas` | Authenticated | جدول سهمیه‌های پایه هر مرحله بر حسب گرم به ازای هر قطعه |
| `PUT` | `/quotas` | Managers | بروزرسانی سهمیه‌های کارخانه |
| `GET` | `/formulas` | Production / Mgmt | لیست فرمول‌های فعال تولید (BOM) |
| `POST` | `/formulas` | Production Mgr | ثبت فرمول تولید جدید با اعتبارسنجی ۱۰۰۰ کیلوگرم |
| `PUT` | `/formulas/:id` | Production Mgr | ویرایش یا ثبت نسخه جدید فرمول |

---

## ۵. مسیرهای چرخه سفارش دان (Orders: `/api/v1/orders`)

| متد | مسیر | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `GET` | `/orders` | Authenticated | فهرست سفارشات (با فیلتر وضعیت، مرغدار و بازه زمانی) |
| `POST` | `/orders` | Farmer / Managers | ثبت درخواست سفارش دان جدید بر مبنای گله |
| `GET` | `/orders/:id` | Authenticated | مشاهده جزئیات سفارش و تاریخچه تغییر وضعیت‌ها |
| `POST` | `/orders/:id/transition` | Role Dependent | تغییر وضعیت سفارش (بر اساس State Machine رسمی) |
| `POST` | `/orders/:id/cancel` | Farmer / Managers | ابطال سفارش قبل از شروع بارگیری |

---

## ۶. مسیرهای لجستیک، رانندگان و تحویل (Logistics: `/api/v1/logistics`)

| متد | مسیر | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `GET` | `/drivers` | Scale / Managers | لیست رانندگان فعال، پلاک و خودروها |
| `POST` | `/drivers` | Scale / Managers | ثبت راننده جدید با شماره شبا و پلاک |
| `PUT` | `/drivers/:id` | Scale / Managers | ویرایش پروفایل راننده |
| `POST` | `/drivers/merge` | Super Admin | ادغام نام‌های تکراری رانندگان |
| `GET` | `/deliveries` | Authenticated | لیست ماموریت‌های حمل و تحویل بار |
| `POST` | `/deliveries/assign` | Scale / Managers | تخصیص راننده به سفارش تایید شده |
| `POST` | `/deliveries/:id/pickup` | Scale / Driver | تایید بارگیری در کارخانه و صدور حواله خروج |
| `POST` | `/deliveries/:id/confirm`| Driver / Farmer | تایید نهایی تحویل بار در مرغداری با کد تایید یا امضا |

---

## ۷. مسیرهای ورود و خروج باسکول (Remittances: `/api/v1/remittances`)

| متد | مسیر | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `GET` | `/inbound` | Scale / Managers | لیست قبوض ورود مواد اولیه با فیلتر تاریخ |
| `POST` | `/inbound` | Scale Operator | ثبت ورود جدید (وزن بارنامه، وزن باسکول، محاسبه افت و کرایه) |
| `GET` | `/outbound` | Scale / Managers | لیست قبوض خروج دان با فیلتر تاریخ |
| `POST` | `/outbound` | Scale Operator | ثبت خروج جدید متصل به سفارش یا آزاد |
| `POST` | `/bulk-move-date` | Scale / Managers | تغییر تاریخ دسته‌جمعی چند حواله |

---

## ۸. مسیرهای خط تولید (Production: `/api/v1/production`)

| متد | مسیر | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `GET` | `/batches` | Production / Mgmt | لیست بچ‌های تولید شده با فیلتر تاریخ |
| `POST` | `/batches` | Production Mgr | ثبت تولید بچ، کسر مواد اولیه و افزایش محصول نهایی در ترنزکشن |

---

## ۹. مسیرهای دفترکل انبار (Inventory: `/api/v1/inventory`)

| متد | مسیر | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `GET` | `/status` | Authenticated | موجودی لحظه‌ای مواد اولیه و دان نهایی تا تاریخ انتخابی |
| `GET` | `/ledger` | Warehouse / Mgmt | لیست تراکنش‌های تغییرناپذیر دفترکل انبار |
| `GET` | `/analysis-report`| Warehouse / Mgmt | گزارش جامع گردش کالا (اول دوره، ورود، تولید، خروج، مصارف و تعدیل) |
| `POST` | `/adjustments` | Warehouse Mgr | ثبت اصلاحیه انبارگردانی با دلیل مکتوب در قالب تراکنش دفترکل |

---

## ۱۰. مسیرهای هوش مصنوعی و اسناد (AI: `/api/v1/ai`)

| متد | مسیر | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `POST` | `/extract-ticket` | Scale Operator | استخراج اقلام قبض باسکول/بارنامه با Gemini و برگرداندن JSON جهت تایید انسانی |
| `POST` | `/assistant-query`| Managers | پرسش و پاسخ تحلیلی از دستیار مدیریت با استفاده از ابزارهای امن و مجاز |

---

## ۱۱. مسیرهای سلامت سیستم و نظارت (Observability: `/api/v1/health`)

| متد | مسیر | دسترسی | توضیحات |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | بررسی زنده بودن سرویس (Liveness probe) |
| `GET` | `/ready` | Public | بررسی آمادگی سرویس و اتصال موفق به PostgreSQL (Readiness probe) |
