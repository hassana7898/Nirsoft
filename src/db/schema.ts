import {
  pgTable,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- ENUMS ---
export const userRoleEnum = pgEnum('user_role', [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'PRODUCTION_MANAGER',
  'WAREHOUSE_MANAGER',
  'SALES_MANAGER',
  'SCALE_OPERATOR',
  'ACCOUNTANT',
  'FARMER',
  'DRIVER',
]);

export const productTypeEnum = pgEnum('product_type', [
  'RAW_MATERIAL',
  'FINISHED_GOOD',
]);

export const flockStatusEnum = pgEnum('flock_status', [
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);

export const orderStatusEnum = pgEnum('order_status', [
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
  'CANCELLED',
]);

export const ledgerActionEnum = pgEnum('ledger_action', [
  'PURCHASE_RECEIPT',
  'PRODUCTION_CONSUMPTION',
  'PRODUCTION_OUTPUT',
  'SALES_DISPATCH',
  'ADJUSTMENT_INCREASE',
  'ADJUSTMENT_DECREASE',
  'REVERSAL',
]);

export const deliveryStatusEnum = pgEnum('delivery_status', [
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CONFIRMED',
  'CANCELLED',
]);

// --- 1. USERS & ROLES & SESSIONS ---
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  phoneNumber: text('phone_number').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: userRoleEnum('role').notNull().default('SCALE_OPERATOR'),
  farmerId: text('farmer_id'),
  driverId: text('driver_id'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  module: text('module').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable('user_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- 2. FARMERS, FARMS, HOUSES & FLOCKS ---
export const farmers = pgTable('farmers', {
  id: text('id').primaryKey(),
  code: text('code').unique(),
  fullName: text('full_name').notNull(),
  nationalId: text('national_id'),
  phoneNumber: text('phone_number'),
  address: text('address'),
  creditLimit: numeric('credit_limit', { precision: 16, scale: 2 }).default('0'),
  isHidden: boolean('is_hidden').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const farms = pgTable('farms', {
  id: text('id').primaryKey(),
  farmerId: text('farmer_id').notNull().references(() => farmers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  licenseNumber: text('license_number'),
  province: text('province'),
  city: text('city'),
  locationAddress: text('location_address'),
  capacity: integer('capacity').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const poultryHouses = pgTable('poultry_houses', {
  id: text('id').primaryKey(),
  farmId: text('farm_id').notNull().references(() => farms.id, { onDelete: 'cascade' }),
  houseNumber: text('house_number').notNull(),
  capacity: integer('capacity').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const flocks = pgTable('flocks', {
  id: text('id').primaryKey(),
  farmerId: text('farmer_id').notNull().references(() => farmers.id, { onDelete: 'restrict' }),
  farmId: text('farm_id').references(() => farms.id),
  houseId: text('house_id').references(() => poultryHouses.id),
  flockCode: text('flock_code'),
  breed: text('breed').notNull().default('Ross 308'),
  chickCount: integer('chick_count').notNull(),
  startDate: text('start_date').notNull(), // ISO YYYY-MM-DD
  expectedEndDate: text('expected_end_date'),
  actualEndDate: text('actual_end_date'),
  finalChickenWeight: numeric('final_chicken_weight', { precision: 14, scale: 3 }).default('0'),
  status: flockStatusEnum('status').notNull().default('ACTIVE'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const dailyFlockRecords = pgTable('daily_flock_records', {
  id: text('id').primaryKey(),
  flockId: text('flock_id').notNull().references(() => flocks.id, { onDelete: 'cascade' }),
  recordDate: text('record_date').notNull(), // YYYY-MM-DD
  dayOfAge: integer('day_of_age').notNull(),
  mortalityCount: integer('mortality_count').notNull().default(0),
  feedConsumedKg: numeric('feed_consumed_kg', { precision: 12, scale: 3 }).notNull().default('0'),
  waterConsumedLiters: numeric('water_consumed_liters', { precision: 12, scale: 3 }).default('0'),
  averageWeightGrams: numeric('average_weight_grams', { precision: 10, scale: 2 }).default('0'),
  temperatureCelsius: numeric('temperature_celsius', { precision: 5, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('flock_record_date_idx').on(table.flockId, table.recordDate),
]);

// --- 3. PRODUCTS, CATEGORIES, FORMULAS & QUOTAS ---
export const productCategories = pgTable('product_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  code: text('code').unique(),
  name: text('name').notNull(),
  type: productTypeEnum('type').notNull(),
  categoryId: text('category_id').references(() => productCategories.id),
  unit: text('unit').notNull().default('kg'),
  defaultPrice: numeric('default_price', { precision: 16, scale: 2 }).default('0'),
  minStockAlert: numeric('min_stock_alert', { precision: 14, scale: 3 }).default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const feedQuotas = pgTable('feed_quotas', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  quotaPerChickGrams: numeric('quota_per_chick_grams', { precision: 10, scale: 2 }).notNull(),
  phaseDurationDays: integer('phase_duration_days').default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('feed_quota_product_idx').on(table.productId),
]);

export const formulas = pgTable('formulas', {
  id: text('id').primaryKey(),
  finishedGoodId: text('finished_good_id').notNull().references(() => products.id),
  title: text('title').notNull(),
  version: integer('version').notNull().default(1),
  batchBasisKg: numeric('batch_basis_kg', { precision: 12, scale: 3 }).notNull().default('1000.000'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const formulaItems = pgTable('formula_items', {
  id: text('id').primaryKey(),
  formulaId: text('formula_id').notNull().references(() => formulas.id, { onDelete: 'cascade' }),
  rawMaterialId: text('raw_material_id').notNull().references(() => products.id),
  quantityKg: numeric('quantity_kg', { precision: 10, scale: 4 }).notNull(), // Per 1kg or batch
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- 4. FEED ORDERS & ORDER ITEMS ---
export const feedOrders = pgTable('feed_orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  farmerId: text('farmer_id').notNull().references(() => farmers.id),
  flockId: text('flock_id').notNull().references(() => flocks.id),
  productId: text('product_id').notNull().references(() => products.id),
  requestedQuantityKg: numeric('requested_quantity_kg', { precision: 14, scale: 3 }).notNull(),
  productVariant: text('product_variant'),
  isCrumble: boolean('is_crumble').notNull().default(false),
  status: orderStatusEnum('status').notNull().default('SUBMITTED'),
  requestedDate: text('requested_date').notNull(), // YYYY-MM-DD
  approvedBy: text('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const feedOrderItems = pgTable('feed_order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => feedOrders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  quantityKg: numeric('quantity_kg', { precision: 14, scale: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 16, scale: 2 }).default('0'),
  totalPrice: numeric('total_price', { precision: 16, scale: 2 }).default('0'),
  notes: text('notes'),
});

// --- 5. DRIVERS, VEHICLES & DELIVERIES ---
export const drivers = pgTable('drivers', {
  id: text('id').primaryKey(),
  fullName: text('full_name').notNull(),
  phoneNumber: text('phone_number').unique(),
  nationalCode: text('national_code'),
  iban: text('iban'),
  licenseNumber: text('license_number'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  driverId: text('driver_id').references(() => drivers.id),
  plateNumber: text('plate_number').notNull(),
  model: text('model'),
  capacityKg: numeric('capacity_kg', { precision: 12, scale: 3 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const deliveries = pgTable('deliveries', {
  id: text('id').primaryKey(),
  deliveryNumber: text('delivery_number').notNull().unique(),
  orderId: text('order_id').notNull().references(() => feedOrders.id),
  driverId: text('driver_id').notNull().references(() => drivers.id),
  vehicleId: text('vehicle_id').references(() => vehicles.id),
  dispatchedWeightKg: numeric('dispatched_weight_kg', { precision: 14, scale: 3 }).notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  departureTime: timestamp('departure_time', { withTimezone: true }),
  deliveryTime: timestamp('delivery_time', { withTimezone: true }),
  driverSignature: text('driver_signature'),
  farmerSignature: text('farmer_signature'),
  deliveryConfirmationCode: text('delivery_confirmation_code'),
  status: deliveryStatusEnum('status').notNull().default('ASSIGNED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const deliveryItems = pgTable('delivery_items', {
  id: text('id').primaryKey(),
  deliveryId: text('delivery_id').notNull().references(() => deliveries.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id),
  weightKg: numeric('weight_kg', { precision: 14, scale: 3 }).notNull(),
});

// --- 6. REMITTANCES (INBOUND & OUTBOUND SCALE TICKETS) ---
export const inboundEntries = pgTable('inbound_entries', {
  id: text('id').primaryKey(),
  entryNumber: text('entry_number').notNull().unique(),
  entryDate: text('entry_date').notNull(), // YYYY-MM-DD
  sellerName: text('seller_name').notNull(),
  productId: text('product_id').notNull().references(() => products.id),
  billWeight: numeric('bill_weight', { precision: 14, scale: 3 }).notNull(),
  scaleWeight: numeric('scale_weight', { precision: 14, scale: 3 }).notNull(),
  wastage: numeric('wastage', { precision: 14, scale: 3 }).notNull(),
  billNumber: text('bill_number'),
  origin: text('origin'),
  factoryDestination: text('factory_destination'),
  transportCost: numeric('transport_cost', { precision: 16, scale: 2 }).default('0'),
  driverName: text('driver_name'),
  driverPhone: text('driver_phone'),
  driverIban: text('driver_iban'),
  driverId: text('driver_id').references(() => drivers.id),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('inbound_date_idx').on(table.entryDate),
  index('inbound_product_idx').on(table.productId),
]);

export const outboundExits = pgTable('outbound_exits', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull(),
  exitDate: text('exit_date').notNull(), // YYYY-MM-DD
  farmerId: text('farmer_id').notNull().references(() => farmers.id),
  flockId: text('flock_id').references(() => flocks.id),
  productId: text('product_id').notNull().references(() => products.id),
  weight: numeric('weight', { precision: 14, scale: 3 }).notNull(),
  driverName: text('driver_name'),
  driverId: text('driver_id').references(() => drivers.id),
  productVariant: text('product_variant'),
  isCrumble: boolean('is_crumble').default(false),
  orderId: text('order_id').references(() => feedOrders.id),
  deliveryId: text('delivery_id').references(() => deliveries.id),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('outbound_date_idx').on(table.exitDate),
  index('outbound_farmer_idx').on(table.farmerId),
]);

// --- 7. IMMUTABLE INVENTORY LEDGER ---
export const inventoryLedger = pgTable('inventory_ledger', {
  id: text('id').primaryKey(),
  transactionDate: text('transaction_date').notNull(), // YYYY-MM-DD
  productId: text('product_id').notNull().references(() => products.id),
  action: ledgerActionEnum('action').notNull(),
  quantityChange: numeric('quantity_change', { precision: 14, scale: 3 }).notNull(),
  referenceEntity: text('reference_entity'), // 'inbound_entries', 'outbound_exits', 'production_batches'
  referenceId: text('reference_id'),
  reason: text('reason'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('ledger_product_date_idx').on(table.productId, table.transactionDate),
]);

// --- 8. PRODUCTION BATCHES ---
export const productionBatches = pgTable('production_batches', {
  id: text('id').primaryKey(),
  batchNumber: text('batch_number').notNull().unique(),
  productionDate: text('production_date').notNull(), // YYYY-MM-DD
  finishedGoodId: text('finished_good_id').notNull().references(() => products.id),
  formulaId: text('formula_id').references(() => formulas.id),
  plannedQuantityKg: numeric('planned_quantity_kg', { precision: 14, scale: 3 }).notNull(),
  actualQuantityKg: numeric('actual_quantity_kg', { precision: 14, scale: 3 }).notNull(),
  wasteKg: numeric('waste_kg', { precision: 12, scale: 3 }).default('0'),
  operatorName: text('operator_name'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- 9. SECURITY AUDIT LOGS ---
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  userPhone: text('user_phone'),
  action: text('action').notNull(), // e.g. 'LOGIN', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  oldState: text('old_state'), // JSON string
  newState: text('new_state'), // JSON string
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  requestId: text('request_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('audit_created_at_idx').on(table.createdAt),
]);

// --- 10. SYSTEM SETTINGS & FILES ---
export const systemSettings = pgTable('system_settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(), // JSON or string
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const files = pgTable('files', {
  id: text('id').primaryKey(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  storagePath: text('storage_path').notNull(),
  storageProvider: text('storage_provider').notNull().default('local'),
  uploadedBy: text('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// --- RELATIONS ---
export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  farmer: one(farmers, {
    fields: [users.farmerId],
    references: [farmers.id],
  }),
  driver: one(drivers, {
    fields: [users.driverId],
    references: [drivers.id],
  }),
}));

export const farmersRelations = relations(farmers, ({ many }) => ({
  farms: many(farms),
  flocks: many(flocks),
  orders: many(feedOrders),
}));

export const flocksRelations = relations(flocks, ({ one, many }) => ({
  farmer: one(farmers, {
    fields: [flocks.farmerId],
    references: [farmers.id],
  }),
  farm: one(farms, {
    fields: [flocks.farmId],
    references: [farms.id],
  }),
  dailyRecords: many(dailyFlockRecords),
  orders: many(feedOrders),
}));

export const feedOrdersRelations = relations(feedOrders, ({ one, many }) => ({
  farmer: one(farmers, {
    fields: [feedOrders.farmerId],
    references: [farmers.id],
  }),
  flock: one(flocks, {
    fields: [feedOrders.flockId],
    references: [flocks.id],
  }),
  product: one(products, {
    fields: [feedOrders.productId],
    references: [products.id],
  }),
  deliveries: many(deliveries),
}));
