import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';

const { Pool } = pg;

export type DbType = ReturnType<typeof drizzlePglite<typeof schema>> | ReturnType<typeof drizzlePg<typeof schema>>;

let activeDb: DbType | null = null;
let pgliteInstance: PGlite | null = null;
let pgPoolInstance: pg.Pool | null = null;

export async function getDb(): Promise<DbType> {
  if (activeDb) {
    return activeDb;
  }

  const databaseUrl = process.env.DATABASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Production or explicit DATABASE_URL configuration
  if (databaseUrl && (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))) {
    try {
      pgPoolInstance = new Pool({
        connectionString: databaseUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Verify connection
      const client = await pgPoolInstance.connect();
      client.release();

      activeDb = drizzlePg(pgPoolInstance, { schema });
      console.log('[NIRWARE NEXT] Connected to external PostgreSQL database via Pool.');
      return activeDb;
    } catch (err) {
      console.error('[NIRWARE NEXT] Critical error connecting to PostgreSQL server:', err);
      if (isProduction) {
        throw new Error(`Production database connection failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      console.warn('[NIRWARE NEXT] Falling back to embedded PGlite for development/testing...');
    }
  }

  if (isProduction && !databaseUrl) {
    throw new Error('DATABASE_URL must be specified in production environment.');
  }

  // 2. Embedded PostgreSQL engine (PGlite) for local development and test suites
  if (!pgliteInstance) {
    pgliteInstance = new PGlite();
    await pgliteInstance.waitReady;
  }

  activeDb = drizzlePglite(pgliteInstance, { schema });
  return activeDb;
}

export async function initDb(): Promise<void> {
  await getDb();

  // Create tables, enums and indexes using PostgreSQL DDL
  const initSql = `
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PRODUCTION_MANAGER', 'WAREHOUSE_MANAGER', 'SALES_MANAGER', 'SCALE_OPERATOR', 'ACCOUNTANT', 'FARMER', 'DRIVER');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE product_type AS ENUM ('RAW_MATERIAL', 'FINISHED_GOOD');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE flock_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE order_status AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PRODUCTION_PENDING', 'READY', 'ASSIGNED_TO_DRIVER', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE ledger_action AS ENUM ('PURCHASE_RECEIPT', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT', 'SALES_DISPATCH', 'ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE', 'REVERSAL');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      CREATE TYPE delivery_status AS ENUM ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'CANCELLED');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone_number TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role user_role NOT NULL DEFAULT 'SCALE_OPERATOR',
      farmer_id TEXT,
      driver_id TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      module TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS farmers (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      full_name TEXT NOT NULL,
      national_id TEXT,
      phone_number TEXT,
      address TEXT,
      credit_limit NUMERIC(16, 2) DEFAULT 0,
      is_hidden BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS farms (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      license_number TEXT,
      province TEXT,
      city TEXT,
      location_address TEXT,
      capacity INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS poultry_houses (
      id TEXT PRIMARY KEY,
      farm_id TEXT NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
      house_number TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS flocks (
      id TEXT PRIMARY KEY,
      farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE RESTRICT,
      farm_id TEXT REFERENCES farms(id),
      house_id TEXT REFERENCES poultry_houses(id),
      flock_code TEXT,
      breed TEXT NOT NULL DEFAULT 'Ross 308',
      chick_count INTEGER NOT NULL CHECK (chick_count > 0),
      start_date TEXT NOT NULL,
      expected_end_date TEXT,
      actual_end_date TEXT,
      final_chicken_weight NUMERIC(14, 3) DEFAULT 0,
      status flock_status NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS daily_flock_records (
      id TEXT PRIMARY KEY,
      flock_id TEXT NOT NULL REFERENCES flocks(id) ON DELETE CASCADE,
      record_date TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      type product_type NOT NULL,
      category_id TEXT REFERENCES product_categories(id),
      unit TEXT NOT NULL DEFAULT 'kg',
      default_price NUMERIC(16, 2) DEFAULT 0,
      min_stock_alert NUMERIC(14, 3) DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS feed_quotas (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL UNIQUE REFERENCES products(id),
      quota_per_chick_grams NUMERIC(10, 2) NOT NULL,
      phase_duration_days INTEGER DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS formulas (
      id TEXT PRIMARY KEY,
      finished_good_id TEXT NOT NULL REFERENCES products(id),
      title TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      batch_basis_kg NUMERIC(12, 3) NOT NULL DEFAULT 1000.000,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS formula_items (
      id TEXT PRIMARY KEY,
      formula_id TEXT NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
      raw_material_id TEXT NOT NULL REFERENCES products(id),
      quantity_kg NUMERIC(10, 4) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS feed_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      farmer_id TEXT NOT NULL REFERENCES farmers(id),
      flock_id TEXT NOT NULL REFERENCES flocks(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      requested_quantity_kg NUMERIC(14, 3) NOT NULL,
      product_variant TEXT,
      is_crumble BOOLEAN NOT NULL DEFAULT false,
      status order_status NOT NULL DEFAULT 'SUBMITTED',
      requested_date TEXT NOT NULL,
      approved_by TEXT REFERENCES users(id),
      approved_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS feed_order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES feed_orders(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity_kg NUMERIC(14, 3) NOT NULL,
      unit_price NUMERIC(16, 2) DEFAULT 0,
      total_price NUMERIC(16, 2) DEFAULT 0,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone_number TEXT UNIQUE,
      national_code TEXT,
      iban TEXT,
      license_number TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      driver_id TEXT REFERENCES drivers(id),
      plate_number TEXT NOT NULL,
      model TEXT,
      capacity_kg NUMERIC(12, 3),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      delivery_number TEXT UNIQUE NOT NULL,
      order_id TEXT NOT NULL REFERENCES feed_orders(id),
      driver_id TEXT NOT NULL REFERENCES drivers(id),
      vehicle_id TEXT REFERENCES vehicles(id),
      dispatched_weight_kg NUMERIC(14, 3) NOT NULL,
      invoice_number TEXT NOT NULL,
      departure_time TIMESTAMPTZ,
      delivery_time TIMESTAMPTZ,
      driver_signature TEXT,
      farmer_signature TEXT,
      delivery_confirmation_code TEXT,
      status delivery_status NOT NULL DEFAULT 'ASSIGNED',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS delivery_items (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      weight_kg NUMERIC(14, 3) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inbound_entries (
      id TEXT PRIMARY KEY,
      entry_number TEXT UNIQUE NOT NULL,
      entry_date TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      bill_weight NUMERIC(14, 3) NOT NULL,
      scale_weight NUMERIC(14, 3) NOT NULL,
      wastage NUMERIC(14, 3) NOT NULL,
      bill_number TEXT,
      origin TEXT,
      factory_destination TEXT,
      transport_cost NUMERIC(16, 2) DEFAULT 0,
      driver_name TEXT,
      driver_phone TEXT,
      driver_iban TEXT,
      driver_id TEXT REFERENCES drivers(id),
      created_by TEXT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS outbound_exits (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL,
      exit_date TEXT NOT NULL,
      farmer_id TEXT NOT NULL REFERENCES farmers(id),
      flock_id TEXT REFERENCES flocks(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      weight NUMERIC(14, 3) NOT NULL,
      driver_name TEXT,
      driver_id TEXT REFERENCES drivers(id),
      product_variant TEXT,
      is_crumble BOOLEAN DEFAULT false,
      order_id TEXT REFERENCES feed_orders(id),
      delivery_id TEXT REFERENCES deliveries(id),
      created_by TEXT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      deleted_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS inventory_ledger (
      id TEXT PRIMARY KEY,
      transaction_date TEXT NOT NULL,
      product_id TEXT NOT NULL REFERENCES products(id),
      action ledger_action NOT NULL,
      quantity_change NUMERIC(14, 3) NOT NULL,
      reference_entity TEXT,
      reference_id TEXT,
      reason TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS production_batches (
      id TEXT PRIMARY KEY,
      batch_number TEXT UNIQUE NOT NULL,
      production_date TEXT NOT NULL,
      finished_good_id TEXT NOT NULL REFERENCES products(id),
      formula_id TEXT REFERENCES formulas(id),
      planned_quantity_kg NUMERIC(14, 3) NOT NULL,
      actual_quantity_kg NUMERIC(14, 3) NOT NULL,
      waste_kg NUMERIC(12, 3) DEFAULT 0,
      operator_name TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      user_phone TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      old_state TEXT,
      new_state TEXT,
      ip_address TEXT,
      user_agent TEXT,
      request_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_path TEXT NOT NULL,
      storage_provider TEXT NOT NULL DEFAULT 'local',
      uploaded_by TEXT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_inbound_entry_date ON inbound_entries(entry_date);
    CREATE INDEX IF NOT EXISTS idx_outbound_exit_date ON outbound_exits(exit_date);
    CREATE INDEX IF NOT EXISTS idx_ledger_product_date ON inventory_ledger(product_id, transaction_date);
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
  `;

  if (pgPoolInstance) {
    await pgPoolInstance.query(initSql);
  } else if (pgliteInstance) {
    await pgliteInstance.exec(initSql);
  }
}

export async function checkDatabaseHealth(): Promise<{ isHealthy: boolean; driver: string; error?: string }> {
  try {
    if (pgPoolInstance) {
      const res = await pgPoolInstance.query('SELECT 1 as alive;');
      return { isHealthy: res.rows.length > 0, driver: 'PostgreSQL Server (External Pool)' };
    }
    if (pgliteInstance) {
      const res = await pgliteInstance.query('SELECT 1 as alive;');
      return { isHealthy: res.rows.length > 0, driver: 'PGlite (Embedded PostgreSQL 15/16 Engine)' };
    }
    return { isHealthy: false, driver: 'None', error: 'Database uninitialized' };
  } catch (err: any) {
    return { isHealthy: false, driver: 'Unknown', error: err?.message || String(err) };
  }
}

/**
 * Executes a callback within a managed database transaction.
 * If the callback throws, changes are automatically rolled back.
 */
export async function withTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
  const db = await getDb();
  return (db as any).transaction(callback);
}
