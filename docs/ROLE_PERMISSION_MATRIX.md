# ماتریس نقش‌ها، دسترسی‌ها و امنیت شیء‌محور (ROLE & PERMISSION MATRIX)

در **NIRWARE NEXT** کنترل دسترسی در دو لایه مکمل عمل می‌کند:
1. **RBAC (Role-Based Access Control):** دسترسی به منوها، اکشن‌ها و اندپوینت‌های عمومی.
2. **Object-Level Authorization (Row-Level Security):** قفل کردن داده‌ها به مرغدار یا راننده خاص در سطح کوئری‌های دیتابیس.

---

## ۱. فهرست مجوزهای اتمیک سیستم (Granular Permissions)

| شناسه مجوز | دامنه | شرح عملکرد |
| :--- | :--- | :--- |
| `farmers.read` | Farming | مشاهده لیست و مشخصات مرغداران |
| `farmers.create` | Farming | ثبت مرغدار جدید |
| `farmers.update` | Farming | ویرایش اطلاعات مرغدار |
| `farmers.delete` | Farming | حذف منطقی مرغدار |
| `farmers.merge` | Farming | ادغام سوابق دو مرغدار |
| `flocks.read` | Farming | مشاهده گله‌ها و کارت تحلیل دوره |
| `flocks.create` | Farming | ثبت گله و دوره پرورش جدید |
| `flocks.update` | Farming | ویرایش یا بستن دوره گله |
| `flocks.daily_record` | Farming | ثبت اطلاعات روزانه تلفات و دان |
| `feed_orders.create` | Orders | ثبت پیش‌نویس سفارش دان |
| `feed_orders.approve` | Orders | تایید یا رد سفارش دان |
| `feed_orders.cancel` | Orders | ابطال سفارش دان |
| `logistics.assign` | Logistics | تخصیص راننده و خودرو به بار |
| `logistics.weigh` | Logistics | ثبت اوزان پر و خالی در باسکول |
| `logistics.deliver` | Logistics | تایید تخلیه و تحویل دان در مزرعه |
| `production.create` | Production | ثبت بچ و اجرای دستور تولید |
| `production.formula` | Production | تعریف و تغییر فرمول‌های دان (BOM) |
| `inventory.read` | Inventory | مشاهده موجودی و کاردکس کالا |
| `inventory.adjust` | Inventory | ثبت سند اصلاح انبارگردانی |
| `reports.read` | Reports | مشاهده گزارش‌های تحلیلی و مدیریتی |
| `reports.export` | Reports | خروجی اکسل و چاپ ۴ امضا |
| `settings.manage` | System | تنظیمات سربرگ کارخانه، امضاها، سهمیه‌ها |
| `users.manage` | Security | تعریف کاربر، تعیین نقش و ریست رمز عبور |
| `audit.read` | Security | دسترسی به لاگ‌های امنیتی و ممیزی سیستم |

---

## ۲. ماتریس تطبیق نقش‌ها با دسترسی‌ها (RBAC Matrix — 10 Canonical Roles)

| مجوز سیستمی | SUPER_ADMIN | ADMIN | MANAGER | PROD_MGR | WAREHOUSE_MGR | SALES_MGR | SCALE_OPERATOR | ACCOUNTANT | FARMER | DRIVER |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `farmers.read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔒 (Self) | ❌ |
| `farmers.create/update`| ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `farmers.merge` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `flocks.read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔒 (Self) | ❌ |
| `flocks.create/update`| ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | 🔒 (Self) | ❌ |
| `flocks.daily_record`| ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔒 (Self) | ❌ |
| `feed_orders.create` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | 🔒 (Self) | ❌ |
| `feed_orders.approve`| ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `logistics.assign` | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `logistics.weigh` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `logistics.deliver` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔒 (Self) | 🔒 (Self) |
| `production.formula` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `production.create` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `inventory.read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `inventory.adjust` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `reports.read/export` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔒 (Self) | 🔒 (Self) |
| `settings.manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.manage` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `audit.read` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*(علامت 🔒 نشان‌دهنده اعمال محدودیت شیء‌محور است که در بخش زیر شرح داده شده است)*

---

## ۳. سیاست‌های امنیت شیء‌محور (Object-Level Authorization Policies)

کنترل دسترسی شیء‌محور در بک‌اند تضمین می‌کند که حتی در صورت دستکاری آی‌دی‌ها در پارامترهای کلاینت، دسترسی غیرمجاز متوقف شود:

### ۳.۱. سیاست دسترسی مرغدار (Farmer Scoping Policy)
```typescript
// تمام درخواست‌های کاربر دارای نقش FARMER مقید به شناسه مرغدار او می‌شوند:
if (currentUser.role === 'FARMER') {
  queryFilter.farmerId = currentUser.farmerId;
}
```
- مرغدار فقط می‌تواند مزارع، سالن‌ها، گله‌ها، سهمیه‌ها، سفارش‌ها و تاییدیه‌های بار متعلق به شناسه مرغداری ثبت‌شده برای اکانت خود را مشاهده یا تغییر دهد.
- هر تلاشی برای فراخوانی اندپوینت گله یا سفارش متعلق به مرغدار دیگر با خطای `403 Forbidden` مواجه می‌شود.

### ۳.۲. سیاست دسترسی راننده (Driver Scoping Policy)
```typescript
// تمام درخواست‌های کاربر دارای نقش DRIVER مقید به شناسه راننده او می‌شوند:
if (currentUser.role === 'DRIVER') {
  queryFilter.driverId = currentUser.driverId;
}
```
- راننده صرفاً ماموریت‌های تحویل (`deliveries`) تخصیص‌یافته به شناسه خودش را می‌بیند.
- اطلاعات مزارع و فاکتورهای سایر رانندگان برای او مخفی است.
