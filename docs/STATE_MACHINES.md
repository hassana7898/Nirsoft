# ماشین‌های وضعیت رسمی سیستم (FORMAL STATE MACHINES)

در **NIRWARE NEXT** کلیه تغییرات وضعیت در دامنه‌های سفارش، لجستیک و تولید بر مبنای ماشین وضعیت قطعی (Deterministic Finite State Machine) کنترل می‌شوند. هیچ وضعیتی بدون اعتبارسنجی نقش، وضعیت پیشین و ثبت در لاگ ممیزی تغییر نمی‌کند.

---

## ۱. ماشین وضعیت سفارش دان (Feed Order State Machine)

### ۱.۱. نمودار انتقال وضعیت‌ها
```text
  [ DRAFT ]
      │ (submit)
      ▼
  [ SUBMITTED ]
      │ (review)
      ▼
  [ PENDING_APPROVAL ] ──(reject)──► [ REJECTED ]
      │ (approve)
      ▼
  [ APPROVED ] ──(cancel)─────────► [ CANCELLED ]
      │
      ├─ (need production) ──► [ PRODUCTION_PENDING ]
      │                                │ (batch completed)
      │                                ▼
      └─ (stock available) ───► [ READY ]
                                       │ (assign driver & vehicle)
                                       ▼
                                [ ASSIGNED_TO_DRIVER ]
                                       │ (weigh & load at factory)
                                       ▼
                                [ PICKED_UP ]
                                       │ (depart factory)
                                       ▼
                                [ IN_TRANSIT ]
                                       │ (arrive at farm)
                                       ▼
                                [ DELIVERED ]
                                       │ (farmer OTP / digital sign)
                                       ▼
                                [ CONFIRMED ] (FINAL)
```

### ۱.۲. جدول ماتریس انتقال وضعیت سفارش (Transition Matrix)

| وضعیت مبدأ | عملیات (Action) | وضعیت مقصد | نقش‌های مجاز | داده‌های الزامی | اثرات جانبی (Side Effects) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DRAFT` | `SUBMIT` | `SUBMITTED` | Farmer, Manager | گله، نوع محصول، وزن درخواستی | بررسی اولیه سهمیه مجاز گله |
| `SUBMITTED` | `QUEUE_REVIEW` | `PENDING_APPROVAL` | Manager, Sales | - | ارسال نوتیفیکیشن به کارتابل مدیر کارخانه |
| `PENDING_APPROVAL` | `APPROVE` | `APPROVED` | Factory Manager | شناسه کاربر تاییدکننده | رزرو سهمیه گله و ثبت زمان تایید |
| `PENDING_APPROVAL` | `REJECT` | `REJECTED` | Factory Manager | دلیل رد سفارش (متنی) | آزادسازی سهمیه و اطلاع به مرغدار |
| `APPROVED` | `REQUEST_PROD` | `PRODUCTION_PENDING`| Production Mgr | تاریخ برنامه‌ریزی تولید | ایجاد پیش‌نویس برنامه بچ تولید |
| `PRODUCTION_PENDING`| `COMPLETE_PROD`| `READY` | Production Mgr | شناسه بچ تولیدی | تطابق موجودی محصول نهایی |
| `APPROVED` | `MARK_READY` | `READY` | Warehouse Mgr | تایید موجودی آماده در انبار | آماده‌سازی جهت بارگیری |
| `READY` | `ASSIGN_DRIVER`| `ASSIGNED_TO_DRIVER`| Logistics, Scale | شناسه راننده، شناسه خودرو | ایجاد رکورد `Delivery` و اعلان به راننده |
| `ASSIGNED_TO_DRIVER`| `LOAD_TRUCK` | `PICKED_UP` | Scale Operator | وزن پر، وزن خالی، قبض خروج | صدور حواله خروج رسمی و کسر موقت انبار |
| `PICKED_UP` | `DEPART` | `IN_TRANSIT` | Driver, Scale | ساعت حرکت | شروع رهگیری بار |
| `IN_TRANSIT` | `UNLOAD` | `DELIVERED` | Driver | زمان رسیدن، عکس تخلیه | تولید کد تایید تحویل (OTP) برای مرغدار |
| `DELIVERED` | `CONFIRM` | `CONFIRMED` | Farmer, Scale | کد تایید یا امضای دیجیتال | ثبت قطعی در دفترکل انبار، بروزرسانی سوابق مصرف گله |
| `SUBMITTED`/`APPROVED`| `CANCEL`| `CANCELLED` | Manager, Farmer | دلیل ابطال | آزادسازی سهمیه و برگشت رزرو انبار |

---

## ۲. ماشین وضعیت ماموریت حمل بار (Delivery State Machine)

```text
ASSIGNED ──► WEIGHING_IN ──► LOADED ──► IN_TRANSIT ──► UNLOADED ──► CONFIRMED
    │                                                                  ▲
    └───(reassign driver)──► REASSIGNED                                │
                                                                       │
    (delivery dispute / weight discrepancy) ──► DISPUTED ──────────────┘
```

- **تضمین عدم ثبت دوگانه (Idempotency):** هر فرآیند تایید تحویل دارای کلید انحصار (`idempotencyKey = delivery_id + order_id`) است تا فشردن مکرر دکمه تایید هرگز منجر به کسر چندباره از انبار یا افزایش دوباره سوابق مصرف مرغدار نگردد.

---

## ۳. ماشین وضعیت بچ تولیدی (Production Batch State Machine)

```text
PLANNED ──► IN_PROGRESS ──► COMPLETED
   │              │
   ▼              ▼
CANCELLED      FAILED (Rollback transaction)
```

- در وضعیت `IN_PROGRESS`، مواد اولیه در پایگاه داده رزرو می‌شوند.
- انتقال به `COMPLETED` صرفاً درون یک **PostgreSQL ACID Transaction** صورت می‌پذیرد:
  1. کسر قطعی مواد اولیه با نسبت فرمول از دفترکل انبار (`PRODUCTION_CONSUMPTION`).
  2. افزایش تناژ خالص محصول نهایی در دفترکل انبار (`PRODUCTION_OUTPUT`).
  3. ثبت ضایعات و افت خط تولید در صورت وجود.
  4. در صورت بروز هرگونه خطا، تراکنش به طور کامل Rollback می‌شود.
