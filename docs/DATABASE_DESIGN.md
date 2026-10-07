# طراحی پایگاه داده رابطه ای (DATABASE DESIGN — POSTGRESQL)

**تعداد جداول پایگاه داده در فاز ۲:** دقیقاً ۲۸ جدول (Actual Table Count = 28)

## ۱. اصول طراحی
1. **جامعیت ارجاعی (Referential Integrity):** استفاده از کلیدهای خارجی واقعی (Foreign Keys) با رفتار مشخص `ON DELETE RESTRICT` یا `CASCADE`.
2. **فیلدهای ممیزی (Audit Fields):** کلیه جداول اصلی دارای `created_at`, `updated_at`, `created_by`, `updated_by` و برای حذف منطقی دارای `deleted_at` هستند.
3. **دفترکل تغییرناپذیر (Immutable Transactions):** جداول لاگ و تراکنش‌های انبار فقط `INSERT-ONLY` هستند.
4. **استانداردسازی نوع داده‌ها:**
   - وزن و مقادیر مقداری: `NUMERIC(14, 3)` (دقت تا گرم)
   - مبالغ و کرایه‌ها: `NUMERIC(16, 2)` (ریال/تومان)
   - زمان‌ها: `TIMESTAMPTZ` (ذخیره استاندارد به فرمت UTC، نمایش به جلالی در کلاینت)
5. **فهرست کامل ۲۸ جدول پایگاه داده:**
   1. `users` | 2. `roles` | 3. `permissions` | 4. `user_roles` | 5. `sessions`
   6. `farmers` | 7. `farms` | 8. `poultry_houses` | 9. `flocks` | 10. `daily_flock_records`
   11. `product_categories` | 12. `products` | 13. `feed_quotas` | 14. `formulas` | 15. `formula_items`
   16. `feed_orders` | 17. `feed_order_items` | 18. `drivers` | 19. `vehicles` | 20. `deliveries`
   21. `delivery_items` | 22. `inbound_entries` | 23. `outbound_exits` | 24. `inventory_ledger` | 25. `production_batches`
   26. `audit_logs` | 27. `system_settings` | 28. `files`

---

## ۲. جداول و مدل‌های داده

### ۲.۱. کاربران و دسترسی‌ها (Users & Authentication)
```sql
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'PRODUCTION_MANAGER',
  'WAREHOUSE_MANAGER',
  'SALES_MANAGER',
  'SCALE_OPERATOR',
  'ACCOUNTANT',
  'FARMER',
  'DRIVER'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role user_role NOT NULL DEFAULT 'SCALE_OPERATOR',
  farmer_id UUID REFERENCES farmers(id), -- برای اتصال به پروفایل مرغدار در صورت نقش FARMER
  driver_id UUID REFERENCES drivers(id), -- برای اتصال به پروفایل راننده در صورت نقش DRIVER
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

### ۲.۲. مرغداران، مزارع، سالن‌ها و گله‌ها (Poultry Hierarchy)
```sql
CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  national_id VARCHAR(20),
  phone_number VARCHAR(15),
  address TEXT,
  credit_limit NUMERIC(16, 2) DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  license_number VARCHAR(50),
  province VARCHAR(60),
  city VARCHAR(60),
  location_address TEXT,
  capacity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE poultry_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  house_number VARCHAR(20) NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE flock_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE flocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
  farm_id UUID REFERENCES farms(id),
  house_id UUID REFERENCES poultry_houses(id),
  flock_code VARCHAR(60),
  breed VARCHAR(60) NOT NULL DEFAULT 'Ross 308',
  chick_count INTEGER NOT NULL CHECK (chick_count > 0),
  start_date DATE NOT NULL,
  expected_end_date DATE,
  actual_end_date DATE,
  final_chicken_weight NUMERIC(14, 3) DEFAULT 0, -- وزن نهایی مرغ ارسالی به کشتارگاه
  status flock_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE daily_flock_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flock_id UUID NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  day_of_age INTEGER NOT NULL,
  mortality_count INTEGER NOT NULL DEFAULT 0,
  feed_consumed_kg NUMERIC(12, 3) NOT NULL DEFAULT 0,
  water_consumed_liters NUMERIC(12, 3) DEFAULT 0,
  average_weight_grams NUMERIC(10, 2) DEFAULT 0,
  temperature_celsius NUMERIC(5, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(flock_id, record_date)
);
```

### ۲.۳. کاتالوگ محصولات و فرمول‌ها (Products & Formulas)
```sql
CREATE TYPE product_type AS ENUM ('RAW_MATERIAL', 'FINISHED_GOOD');

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE,
  name VARCHAR(120) NOT NULL,
  type product_type NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  default_price NUMERIC(16, 2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE feed_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  quota_per_chick_grams NUMERIC(10, 2) NOT NULL, -- سهمیه بر حسب گرم به ازای هر قطعه جوجه
  phase_duration_days INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(product_id)
);

CREATE TABLE formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_good_id UUID NOT NULL REFERENCES products(id),
  title VARCHAR(120) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  batch_basis_kg NUMERIC(12, 3) NOT NULL DEFAULT 1000.000, -- مبنای ۱۰۰۰ کیلوگرم (۱ تن)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE formula_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES products(id),
  quantity_kg NUMERIC(10, 4) NOT NULL, -- مقدار مصرف در هر ۱ کیلوگرم یا ۱ تن
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### ۲.۴. ورود مواد اولیه به باسکول (Raw Material Inbound Entries)
```sql
CREATE TABLE inbound_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  seller_name VARCHAR(150) NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  bill_weight NUMERIC(14, 3) NOT NULL,
  scale_weight NUMERIC(14, 3) NOT NULL,
  wastage NUMERIC(14, 3) GENERATED ALWAYS AS (scale_weight - bill_weight) STORED,
  bill_number VARCHAR(80),
  origin VARCHAR(100),
  factory_destination VARCHAR(100),
  transport_cost NUMERIC(16, 2) DEFAULT 0,
  driver_name VARCHAR(120),
  driver_phone VARCHAR(20),
  driver_iban VARCHAR(34),
  driver_id UUID REFERENCES drivers(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_inbound_date ON inbound_entries(entry_date);
CREATE INDEX idx_inbound_product ON inbound_entries(product_id);
```

### ۲.۵. سفارشات دان، تخصیص و خروج (Orders, Deliveries & Exits)
```sql
CREATE TYPE order_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'PRODUCTION_PENDING',
  'READY',
  'ASSIGNED_TO_DRIVER',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CONFIRMED',
  'CANCELLED'
);

CREATE TABLE feed_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  farmer_id UUID NOT NULL REFERENCES farmers(id),
  flock_id UUID NOT NULL REFERENCES flocks(id),
  product_id UUID NOT NULL REFERENCES products(id),
  requested_quantity_kg NUMERIC(14, 3) NOT NULL,
  product_variant VARCHAR(80), -- مثلا کرامبل یا پلت
  is_crumble BOOLEAN NOT NULL DEFAULT false,
  status order_status NOT NULL DEFAULT 'SUBMITTED',
  requested_date DATE NOT NULL,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  phone_number VARCHAR(15) UNIQUE,
  national_code VARCHAR(20),
  iban VARCHAR(34),
  license_number VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id),
  plate_number VARCHAR(30) NOT NULL,
  model VARCHAR(60),
  capacity_kg NUMERIC(12, 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES feed_orders(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  dispatched_weight_kg NUMERIC(14, 3) NOT NULL,
  invoice_number VARCHAR(80) NOT NULL,
  departure_time TIMESTAMPTZ,
  delivery_time TIMESTAMPTZ,
  driver_signature TEXT,
  farmer_signature TEXT,
  delivery_confirmation_code VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outbound_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(60) NOT NULL,
  exit_date DATE NOT NULL,
  farmer_id UUID NOT NULL REFERENCES farmers(id),
  flock_id UUID REFERENCES flocks(id),
  product_id UUID NOT NULL REFERENCES products(id),
  weight NUMERIC(14, 3) NOT NULL,
  driver_name VARCHAR(120),
  driver_id UUID REFERENCES drivers(id),
  product_variant VARCHAR(80),
  is_crumble BOOLEAN DEFAULT false,
  order_id UUID REFERENCES feed_orders(id),
  delivery_id UUID REFERENCES deliveries(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_outbound_date ON outbound_exits(exit_date);
CREATE INDEX idx_outbound_farmer ON outbound_exits(farmer_id);
```

### ۲.۶. دفترکل تراکنش‌های انبار (Inventory Ledger)
```sql
CREATE TYPE ledger_action AS ENUM (
  'PURCHASE_RECEIPT',       -- ورودی مواد اولیه
  'PRODUCTION_CONSUMPTION', -- مصرف ماده اولیه در خط تولید
  'PRODUCTION_OUTPUT',      -- ورود محصول نهایی از خط تولید
  'SALES_DISPATCH',         -- خروج دان به مرغدار
  'ADJUSTMENT_INCREASE',    -- تعدیل افزایش انبارگردانی
  'ADJUSTMENT_DECREASE',    -- تعدیل کاهش انبارگردانی
  'REVERSAL'                -- برگشت سند
);

CREATE TABLE inventory_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  action ledger_action NOT NULL,
  quantity_change NUMERIC(14, 3) NOT NULL, -- مثبت برای ورودی و تولید، منفی برای مصرف و خروج
  reference_entity VARCHAR(60), -- 'inbound_entries', 'outbound_exits', 'production_batches', etc.
  reference_id UUID,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ledger_product_date ON inventory_ledger(product_id, transaction_date);
```

### ۲.۷. تولید و رکوردهای بچ (Production & Batch Execution)
```sql
CREATE TABLE production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  production_date DATE NOT NULL,
  finished_good_id UUID NOT NULL REFERENCES products(id),
  formula_id UUID REFERENCES formulas(id),
  planned_quantity_kg NUMERIC(14, 3) NOT NULL,
  actual_quantity_kg NUMERIC(14, 3) NOT NULL,
  waste_kg NUMERIC(12, 3) DEFAULT 0,
  operator_name VARCHAR(120),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### ۲.۸. لاگ ممیزی امنیتی و سیستمی (Security Audit Logs)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  user_phone VARCHAR(20),
  action VARCHAR(80) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'LOGIN', etc.
  entity_type VARCHAR(80) NOT NULL, -- 'feed_orders', 'inbound_entries', 'formulas', etc.
  entity_id VARCHAR(80),
  old_state JSONB,
  new_state JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_time ON audit_logs(created_at DESC);
```
