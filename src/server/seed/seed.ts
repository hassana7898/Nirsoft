import { getDb } from '../../db/index.ts';
import {
  roles,
  users,
  productCategories,
  products,
  feedQuotas,
  systemSettings,
  farmers,
  flocks,
  drivers,
  vehicles,
  formulas,
  formulaItems,
  inboundEntries,
  outboundExits,
  inventoryLedger,
  feedOrders,
  productionBatches,
} from '../../db/schema.ts';
import { hashPassword } from '../services/authService.ts';

export async function runDevelopmentSeed(): Promise<void> {
  const db = await getDb();

  // 1. Roles (10 canonical system roles)
  const standardRoles = [
    { id: 'role_super_admin', name: 'SUPER_ADMIN', description: 'مدیر ارشد سامانه' },
    { id: 'role_admin', name: 'ADMIN', description: 'مدیر سیستم' },
    { id: 'role_manager', name: 'MANAGER', description: 'مدیر کارخانه' },
    { id: 'role_prod_mgr', name: 'PRODUCTION_MANAGER', description: 'مدیر تولید' },
    { id: 'role_wh_mgr', name: 'WAREHOUSE_MANAGER', description: 'انباردار' },
    { id: 'role_sales_mgr', name: 'SALES_MANAGER', description: 'مدیر فروش و بازرگانی' },
    { id: 'role_scale_op', name: 'SCALE_OPERATOR', description: 'مسئول باسکول' },
    { id: 'role_accountant', name: 'ACCOUNTANT', description: 'حسابدار' },
    { id: 'role_farmer', name: 'FARMER', description: 'مرغدار' },
    { id: 'role_driver', name: 'DRIVER', description: 'راننده' },
  ];

  for (const r of standardRoles) {
    await db.insert(roles).values(r).onConflictDoNothing();
  }

  // 2. Categories
  const categories = [
    { id: 'cat_raw', name: 'مواد اولیه', description: 'انواع غلات، کنجاله‌ها و ریزمغذی‌ها' },
    { id: 'cat_finished', name: 'محصول نهایی', description: 'انواع دان پلت و کرامبل آماده مصرف طیور' },
  ];

  for (const c of categories) {
    await db.insert(productCategories).values(c).onConflictDoNothing();
  }

  // 3. Products (Raw materials and finished poultry feeds)
  const standardProducts = [
    { id: 'prod_corn', code: 'RM-01', name: 'ذرت دانه‌ای برزیلی', type: 'RAW_MATERIAL' as const, categoryId: 'cat_raw', unit: 'kg', defaultPrice: '125000', minStockAlert: '10000' },
    { id: 'prod_soy', code: 'RM-02', name: 'کنجاله سویا پلت', type: 'RAW_MATERIAL' as const, categoryId: 'cat_raw', unit: 'kg', defaultPrice: '220000', minStockAlert: '8000' },
    { id: 'prod_wheat', code: 'RM-03', name: 'گندم دامی درجه یک', type: 'RAW_MATERIAL' as const, categoryId: 'cat_raw', unit: 'kg', defaultPrice: '135000', minStockAlert: '5000' },
    { id: 'prod_oil', code: 'RM-04', name: 'روغن گیاهی تصفیه‌شده', type: 'RAW_MATERIAL' as const, categoryId: 'cat_raw', unit: 'kg', defaultPrice: '380000', minStockAlert: '2000' },
    { id: 'prod_conc', code: 'RM-05', name: 'کنسانتره ۲.۵٪ گوشتی', type: 'RAW_MATERIAL' as const, categoryId: 'cat_raw', unit: 'kg', defaultPrice: '450000', minStockAlert: '1500' },
    { id: 'prod_dcp', code: 'RM-06', name: 'دی‌کلسیم فسفات (DCP)', type: 'RAW_MATERIAL' as const, categoryId: 'cat_raw', unit: 'kg', defaultPrice: '290000', minStockAlert: '1000' },
    { id: 'prod_starter', code: 'FG-01', name: 'پیش‌دان (سوپر استارتر کرامبل)', type: 'FINISHED_GOOD' as const, categoryId: 'cat_finished', unit: 'kg', defaultPrice: '280000', minStockAlert: '5000' },
    { id: 'prod_grower', code: 'FG-02', name: 'میان‌دان پلت ۲.۵ میلی‌متر', type: 'FINISHED_GOOD' as const, categoryId: 'cat_finished', unit: 'kg', defaultPrice: '265000', minStockAlert: '8000' },
    { id: 'prod_finisher', code: 'FG-03', name: 'پس‌دان پلت ۳ میلی‌متر', type: 'FINISHED_GOOD' as const, categoryId: 'cat_finished', unit: 'kg', defaultPrice: '250000', minStockAlert: '8000' },
  ];

  for (const p of standardProducts) {
    await db.insert(products).values(p).onConflictDoNothing();
  }

  // 4. Feed Quotas (grams per chick)
  const quotas = [
    { id: 'q_starter', productId: 'prod_starter', quotaPerChickGrams: '600.00', phaseDurationDays: 14 },
    { id: 'q_grower', productId: 'prod_grower', quotaPerChickGrams: '1800.00', phaseDurationDays: 18 },
    { id: 'q_finisher', productId: 'prod_finisher', quotaPerChickGrams: '2100.00', phaseDurationDays: 18 },
  ];

  for (const q of quotas) {
    await db.insert(feedQuotas).values(q).onConflictDoNothing();
  }

  // 5. System Settings
  const settings = [
    { id: 'set_factory_name', key: 'factory_name', value: 'کارخانه خوراک طیور نیروار (NIRWARE)', description: 'نام رسمی کارخانه در اسناد' },
    { id: 'set_entry_title', key: 'entry_print_title', value: 'قبض توزین و رسید ورود مواد اولیه', description: 'عنوان برگه ورود' },
    { id: 'set_exit_title', key: 'exit_print_title', value: 'حواله خروج و بارنامه تحویل دان', description: 'عنوان برگه خروج' },
  ];

  for (const s of settings) {
    await db.insert(systemSettings).values(s).onConflictDoNothing();
  }

  // 6. Formulas (BOM recipes for finished feed)
  const formula1 = {
    id: 'formula_starter',
    finishedGoodId: 'prod_starter',
    title: 'فرمول پیش‌دان استارتر راس ۳۰۸ (ویژه دوره آغازین)',
    version: 1,
    batchBasisKg: '1000.000',
    isActive: true,
  };
  await db.insert(formulas).values(formula1).onConflictDoNothing();

  const formula1Items = [
    { id: 'f1_item_1', formulaId: 'formula_starter', rawMaterialId: 'prod_corn', quantityKg: '560.0000' },
    { id: 'f1_item_2', formulaId: 'formula_starter', rawMaterialId: 'prod_soy', quantityKg: '330.0000' },
    { id: 'f1_item_3', formulaId: 'formula_starter', rawMaterialId: 'prod_conc', quantityKg: '50.0000' },
    { id: 'f1_item_4', formulaId: 'formula_starter', rawMaterialId: 'prod_oil', quantityKg: '35.0000' },
    { id: 'f1_item_5', formulaId: 'formula_starter', rawMaterialId: 'prod_dcp', quantityKg: '25.0000' },
  ];
  for (const item of formula1Items) {
    await db.insert(formulaItems).values(item).onConflictDoNothing();
  }

  const formula2 = {
    id: 'formula_grower',
    finishedGoodId: 'prod_grower',
    title: 'فرمول میان‌دان پلت ۲.۵ راس ۳۰۸ (رشد پرشتاب)',
    version: 1,
    batchBasisKg: '1000.000',
    isActive: true,
  };
  await db.insert(formulas).values(formula2).onConflictDoNothing();

  const formula2Items = [
    { id: 'f2_item_1', formulaId: 'formula_grower', rawMaterialId: 'prod_corn', quantityKg: '600.0000' },
    { id: 'f2_item_2', formulaId: 'formula_grower', rawMaterialId: 'prod_soy', quantityKg: '290.0000' },
    { id: 'f2_item_3', formulaId: 'formula_grower', rawMaterialId: 'prod_wheat', quantityKg: '50.0000' },
    { id: 'f2_item_4', formulaId: 'formula_grower', rawMaterialId: 'prod_conc', quantityKg: '35.0000' },
    { id: 'f2_item_5', formulaId: 'formula_grower', rawMaterialId: 'prod_oil', quantityKg: '25.0000' },
  ];
  for (const item of formula2Items) {
    await db.insert(formulaItems).values(item).onConflictDoNothing();
  }

  // 7. Farmers & Active Flocks
  const farmer1 = {
    id: 'farmer_1',
    code: 'FARM-101',
    fullName: 'حاج کریم اکبری (مزرعه بهاران)',
    phoneNumber: '09121111111',
    address: 'مازندران، جاده ساری به جویبار، کیلومتر ۴',
    creditLimit: '500000000',
  };
  const farmer2 = {
    id: 'farmer_2',
    code: 'FARM-102',
    fullName: 'مهندس صابر نوروزی (مرغداری طبرستان)',
    phoneNumber: '09129876543',
    address: 'مازندران، قائمشهر، کمربندی شمالی',
    creditLimit: '400000000',
  };
  const farmer3 = {
    id: 'farmer_3',
    code: 'FARM-103',
    fullName: 'شرکت مرغ گوشتی دشت شمال',
    phoneNumber: '09125554433',
    address: 'بابل، جاده آمل، شهرک صنعتی',
    creditLimit: '900000000',
  };

  await db.insert(farmers).values(farmer1).onConflictDoNothing();
  await db.insert(farmers).values(farmer2).onConflictDoNothing();
  await db.insert(farmers).values(farmer3).onConflictDoNothing();

  const flock1 = {
    id: 'flock_1',
    farmerId: 'farmer_1',
    flockCode: 'دوره پاییزه سالن ۱ (اکبری)',
    breed: 'Ross 308',
    chickCount: 25000,
    startDate: '2026-09-08',
    status: 'ACTIVE' as const,
  };
  const flock2 = {
    id: 'flock_2',
    farmerId: 'farmer_2',
    flockCode: 'دوره پاییزه سالن ۲ (نوروزی)',
    breed: 'Cobb 500',
    chickCount: 18000,
    startDate: '2026-09-20',
    status: 'ACTIVE' as const,
  };
  const flock3 = {
    id: 'flock_3',
    farmerId: 'farmer_3',
    flockCode: 'دوره تابستانه (تسویه شده دشت شمال)',
    breed: 'Ross 308',
    chickCount: 20000,
    startDate: '2026-07-10',
    actualEndDate: '2026-08-25',
    finalChickenWeight: '55000.000', // 55 tons
    status: 'COMPLETED' as const,
  };

  await db.insert(flocks).values(flock1).onConflictDoNothing();
  await db.insert(flocks).values(flock2).onConflictDoNothing();
  await db.insert(flocks).values(flock3).onConflictDoNothing();

  // 8. Drivers & Vehicles
  const driver1 = {
    id: 'driver_1',
    fullName: 'علی رضایی',
    phoneNumber: '09122222222',
    nationalCode: '2091234567',
    licenseNumber: 'LIC-98214',
    isActive: true,
  };
  const driver2 = {
    id: 'driver_2',
    fullName: 'جواد کاظمی',
    phoneNumber: '09127778899',
    nationalCode: '2159876543',
    licenseNumber: 'LIC-77432',
    isActive: true,
  };
  await db.insert(drivers).values(driver1).onConflictDoNothing();
  await db.insert(drivers).values(driver2).onConflictDoNothing();

  await db.insert(vehicles).values({
    id: 'veh_1',
    driverId: 'driver_1',
    plateNumber: '۱۲ ع ۳۴۵ ایران ۶۸',
    model: 'بنز ده تن باری',
    capacityKg: '10000.000',
  }).onConflictDoNothing();

  // 9. Initial Raw Materials Inbound & Inventory Ledger Seed
  const entry1 = {
    id: 'entry_1',
    entryNumber: 'IN-20261001-1042',
    entryDate: '2026-10-01',
    sellerName: 'شرکت پشتیبانی امور دام کشور',
    productId: 'prod_corn',
    billWeight: '25450.000',
    scaleWeight: '25290.000',
    wastage: '-160.000',
    billNumber: 'BL-88412',
    origin: 'بندر امام خمینی',
    driverName: 'جواد کاظمی',
  };
  const entry2 = {
    id: 'entry_2',
    entryNumber: 'IN-20261003-2195',
    entryDate: '2026-10-03',
    sellerName: 'شرکت بازرگانی دانه طلایی',
    productId: 'prod_soy',
    billWeight: '24000.000',
    scaleWeight: '23880.000',
    wastage: '-120.000',
    billNumber: 'BL-91244',
    origin: 'بندر امیرآباد',
    driverName: 'مهدی کریمی',
  };
  const entry3 = {
    id: 'entry_3',
    entryNumber: 'IN-20261005-3814',
    entryDate: '2026-10-05',
    sellerName: 'غلات دشت مرکزی',
    productId: 'prod_wheat',
    billWeight: '20000.000',
    scaleWeight: '19950.000',
    wastage: '-50.000',
    billNumber: 'BL-77319',
    origin: 'سیلوی شهید رجایی',
    driverName: 'علی رضایی',
  };

  await db.insert(inboundEntries).values(entry1).onConflictDoNothing();
  await db.insert(inboundEntries).values(entry2).onConflictDoNothing();
  await db.insert(inboundEntries).values(entry3).onConflictDoNothing();

  // Inventory ledger for raw materials receipts
  await db.insert(inventoryLedger).values([
    {
      id: 'led_in_1',
      transactionDate: '2026-10-01',
      productId: 'prod_corn',
      action: 'PURCHASE_RECEIPT' as const,
      quantityChange: '25290.000',
      referenceEntity: 'inbound_entries',
      referenceId: 'entry_1',
      reason: 'ورود ذرت برزیلی قبض IN-20261001-1042',
    },
    {
      id: 'led_in_2',
      transactionDate: '2026-10-03',
      productId: 'prod_soy',
      action: 'PURCHASE_RECEIPT' as const,
      quantityChange: '23880.000',
      referenceEntity: 'inbound_entries',
      referenceId: 'entry_2',
      reason: 'ورود سویا قبض IN-20261003-2195',
    },
    {
      id: 'led_in_3',
      transactionDate: '2026-10-05',
      productId: 'prod_wheat',
      action: 'PURCHASE_RECEIPT' as const,
      quantityChange: '19950.000',
      referenceEntity: 'inbound_entries',
      referenceId: 'entry_3',
      reason: 'ورود گندم دامی قبض IN-20261005-3814',
    },
    {
      id: 'led_in_4',
      transactionDate: '2026-10-01',
      productId: 'prod_conc',
      action: 'PURCHASE_RECEIPT' as const,
      quantityChange: '8000.000',
      reason: 'موجودی اولیه کنسانتره در سیلو',
    },
    {
      id: 'led_in_5',
      transactionDate: '2026-10-01',
      productId: 'prod_oil',
      action: 'PURCHASE_RECEIPT' as const,
      quantityChange: '4500.000',
      reason: 'موجودی مخازن روغن گیاهی',
    },
    {
      id: 'led_in_6',
      transactionDate: '2026-10-01',
      productId: 'prod_dcp',
      action: 'PURCHASE_RECEIPT' as const,
      quantityChange: '3000.000',
      reason: 'موجودی دی‌کلسیم فسفات',
    },
    // Output of production to have finished feed in stock
    {
      id: 'led_fg_1',
      transactionDate: '2026-10-04',
      productId: 'prod_starter',
      action: 'PRODUCTION_OUTPUT' as const,
      quantityChange: '20000.000',
      reason: 'تولید پیش‌دان پلت در شیفت صبح',
    },
    {
      id: 'led_fg_2',
      transactionDate: '2026-10-05',
      productId: 'prod_grower',
      action: 'PRODUCTION_OUTPUT' as const,
      quantityChange: '35000.000',
      reason: 'تولید میان‌دان پلت در شیفت عصر',
    },
  ]).onConflictDoNothing();

  // 10. Initial Outbound Exits
  const exit1 = {
    id: 'exit_1',
    invoiceNumber: 'OUT-20261004-8114',
    exitDate: '2026-10-04',
    farmerId: 'farmer_1',
    flockId: 'flock_1',
    productId: 'prod_starter',
    weight: '12500.000',
    driverName: 'علی رضایی',
    driverId: 'driver_1',
    isCrumble: true,
  };
  const exit2 = {
    id: 'exit_2',
    invoiceNumber: 'OUT-20261005-9201',
    exitDate: '2026-10-05',
    farmerId: 'farmer_2',
    flockId: 'flock_2',
    productId: 'prod_grower',
    weight: '10000.000',
    driverName: 'جواد کاظمی',
    driverId: 'driver_2',
    isCrumble: false,
  };
  const exit3 = {
    id: 'exit_3',
    invoiceNumber: 'OUT-20260815-5512',
    exitDate: '2026-08-15',
    farmerId: 'farmer_3',
    flockId: 'flock_3',
    productId: 'prod_finisher',
    weight: '90750.000', // Matches flock 3 FCR test
    driverName: 'علی رضایی',
    driverId: 'driver_1',
    isCrumble: false,
  };

  await db.insert(outboundExits).values(exit1).onConflictDoNothing();
  await db.insert(outboundExits).values(exit2).onConflictDoNothing();
  await db.insert(outboundExits).values(exit3).onConflictDoNothing();

  // Ledger records for exits
  await db.insert(inventoryLedger).values([
    {
      id: 'led_out_1',
      transactionDate: '2026-10-04',
      productId: 'prod_starter',
      action: 'SALES_DISPATCH' as const,
      quantityChange: '-12500.000',
      referenceEntity: 'outbound_exits',
      referenceId: 'exit_1',
      reason: 'ارسال حواله پیش‌دان به مرغداری اکبری',
    },
    {
      id: 'led_out_2',
      transactionDate: '2026-10-05',
      productId: 'prod_grower',
      action: 'SALES_DISPATCH' as const,
      quantityChange: '-10000.000',
      referenceEntity: 'outbound_exits',
      referenceId: 'exit_2',
      reason: 'ارسال حواله میان‌دان به مرغداری نوروزی',
    },
  ]).onConflictDoNothing();

  // 11. Initial Feed Orders
  await db.insert(feedOrders).values([
    {
      id: 'ord_1',
      orderNumber: 'ORD-20261006-101',
      farmerId: 'farmer_1',
      flockId: 'flock_1',
      productId: 'prod_grower',
      requestedQuantityKg: '15000.000',
      status: 'APPROVED' as const,
      requestedDate: '2026-10-08',
      notes: 'تخلیه در سیلوی ۲ مرغداری',
    },
    {
      id: 'ord_2',
      orderNumber: 'ORD-20261006-102',
      farmerId: 'farmer_2',
      flockId: 'flock_2',
      productId: 'prod_starter',
      requestedQuantityKg: '8000.000',
      isCrumble: true,
      status: 'SUBMITTED' as const,
      requestedDate: '2026-10-09',
    },
  ]).onConflictDoNothing();

  // 12. Safe Development Test Users
  if (process.env.NODE_ENV !== 'production') {
    const adminPass = await hashPassword('Admin@Dev2026!');
    const scalePass = await hashPassword('Scale@Dev2026!');
    const farmerPass = await hashPassword('Farmer@Dev2026!');
    const driverPass = await hashPassword('Driver@Dev2026!');

    await db.insert(users).values({
      id: 'user_dev_admin',
      phoneNumber: '09120000000',
      passwordHash: adminPass,
      fullName: 'مدیر ارشد کارخانه (مهندس علایی)',
      role: 'SUPER_ADMIN',
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(users).values({
      id: 'user_dev_scale',
      phoneNumber: '09123333333',
      passwordHash: scalePass,
      fullName: 'متصدی باسکول کارخانه',
      role: 'SCALE_OPERATOR',
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(users).values({
      id: 'user_dev_farmer',
      phoneNumber: '09121111111',
      passwordHash: farmerPass,
      fullName: 'حاج کریم اکبری (مرغدار)',
      role: 'FARMER',
      farmerId: 'farmer_1',
      isActive: true,
    }).onConflictDoNothing();

    await db.insert(users).values({
      id: 'user_dev_driver',
      phoneNumber: '09122222222',
      passwordHash: driverPass,
      fullName: 'علی رضایی (راننده ده تن)',
      role: 'DRIVER',
      driverId: 'driver_1',
      isActive: true,
    }).onConflictDoNothing();
  }
}
