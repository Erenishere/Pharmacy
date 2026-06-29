const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '../../Backend');
const backendNodeModules = path.join(backendRoot, 'node_modules');
const mongoose = require(path.join(backendNodeModules, 'mongoose'));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsAt = trimmed.indexOf('=');
    if (equalsAt === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsAt).trim();
    const rawValue = trimmed.slice(equalsAt + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function assertSafeSeedUri(uri) {
  if (!uri) {
    throw new Error('Set SMOKE_MONGODB_URI, MONGODB_TEST_URI, or MONGODB_URI before running QA seed.');
  }

  const lowerUri = uri.toLowerCase();
  const looksLocal =
    lowerUri.includes('localhost') ||
    lowerUri.includes('127.0.0.1') ||
    lowerUri.includes('mongodb-memory') ||
    lowerUri.includes('smoke') ||
    lowerUri.includes('test');

  if (!looksLocal && process.env.ALLOW_SMOKE_SEED !== '1') {
    throw new Error(
      'Refusing to seed a non-local MongoDB URI. Set ALLOW_SMOKE_SEED=1 only for an approved smoke database.'
    );
  }
}

function requireBackendModel(relativePath) {
  return require(path.join(backendRoot, relativePath));
}

async function upsertBySave(Model, query, data) {
  const doc = (await Model.findOne(query)) || new Model(query);
  doc.set(data);
  return doc.save();
}

async function seedSmokeData() {
  loadEnvFile(path.join(backendRoot, '.env'));
  const mongoUri = process.env.SMOKE_MONGODB_URI || process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
  assertSafeSeedUri(mongoUri);

  await mongoose.connect(mongoUri);

  const User = requireBackendModel('src/models/User');
  const Customer = requireBackendModel('src/models/Customer');
  const Supplier = requireBackendModel('src/models/Supplier');
  const Account = requireBackendModel('src/models/Account');
  const Item = requireBackendModel('src/models/Item');
  const Warehouse = requireBackendModel('src/models/Warehouse');
  const Inventory = requireBackendModel('src/models/Inventory');
  const Invoice = requireBackendModel('src/models/Invoice');
  const PurchaseOrder = requireBackendModel('src/models/PurchaseOrder');
  const CashReceipt = requireBackendModel('src/models/CashReceipt');
  const EOrder = requireBackendModel('src/models/EOrder');
  const RoutePlan = requireBackendModel('src/models/RoutePlan');
  const SalaryPackage = requireBackendModel('src/models/SalaryPackage');
  const SalaryCalculation = requireBackendModel('src/models/SalaryCalculation');
  const Salesman = requireBackendModel('src/models/Salesman');
  const Town = requireBackendModel('src/models/town');
  const Area = requireBackendModel('src/models/area');
  const DimensionBranch = requireBackendModel('src/models/dimensionbranch');
  const Designation = requireBackendModel('src/models/designation');
  const CustomerType = requireBackendModel('src/models/customertype');
  const AccountHead = requireBackendModel('src/models/accounthead');
  const Company = requireBackendModel('src/models/Company');
  const Category = requireBackendModel('src/models/category');
  const BusinessType = requireBackendModel('src/models/business');
  const SubCategory = requireBackendModel('src/models/subcategory');
  const Formula = requireBackendModel('src/models/formula');
  const FormulaSize = requireBackendModel('src/models/formulasize');

  const objectId = () => new mongoose.Types.ObjectId();
  const password = process.env.SMOKE_ADMIN_PASSWORD || 'SmokePass123';
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  const currentMonthName = monthNames[currentMonthIndex];
  const currentMonthYear = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
  const monthDay = (day) => new Date(currentYear, currentMonthIndex, day);
  const periodStart = new Date(Date.UTC(currentYear, 0, 1, 12));
  const periodEnd = new Date(Date.UTC(currentYear, 11, 31, 12));

  const user = await upsertBySave(
    User,
    { username: process.env.SMOKE_ADMIN_USERNAME || 'smoke.admin' },
    {
      username: process.env.SMOKE_ADMIN_USERNAME || 'smoke.admin',
      email: 'smoke.admin@indus.pk',
      password,
      role: 'admin',
      permissions: {
        modules: ['*'],
        features: ['*'],
        dataAccess: { dimensionBased: false, allowedDimensions: [] }
      },
      isActive: true
    }
  );

  const town = await upsertBySave(
    Town,
    { name: 'Smoke Town' },
    {
      name: 'Smoke Town',
      region: 'South'
    }
  );

  const plannedArea = await upsertBySave(
    Area,
    { name: 'Smoke Planned Area' },
    {
      name: 'Smoke Planned Area',
      townId: town._id
    }
  );

  const dimension = await upsertBySave(
    DimensionBranch,
    { code: 'SMKD01' },
    {
      code: 'SMKD01',
      name: 'Smoke Dimension',
      description: 'QA smoke dimension for workbook account registration proof',
      type: 'BRANCH',
      isActive: true,
      createdBy: user._id
    }
  );

  const designation = await upsertBySave(
    Designation,
    { name: 'Smoke Designation' },
    {
      name: 'Smoke Designation',
      description: 'QA smoke designation',
      isActive: true
    }
  );

  const customerType = await upsertBySave(
    CustomerType,
    { name: 'Smoke Customer Type' },
    {
      name: 'Smoke Customer Type',
      description: 'QA smoke customer type',
      isActive: true
    }
  );

  const accountHead = await upsertBySave(
    AccountHead,
    { code: 'SMKAH1' },
    {
      name: 'Smoke Account Head',
      code: 'SMKAH1',
      type: 'Sales',
      isActive: true
    }
  );

  const itemCompany = await upsertBySave(
    Company,
    { code: 'SMKCO' },
    {
      name: 'Smoke Pharma Company',
      code: 'SMKCO',
      description: 'QA smoke company for item management workflow',
      isActive: true
    }
  );

  const itemCategory = await upsertBySave(
    Category,
    { name: 'Smoke Category' },
    {
      name: 'Smoke Category',
      description: 'QA smoke category for item management workflow',
      isActive: true
    }
  );

  const itemSubCategory = await upsertBySave(
    SubCategory,
    { name: 'Smoke Sub Category', categoryId: itemCategory._id },
    {
      name: 'Smoke Sub Category',
      categoryId: itemCategory._id,
      description: 'QA smoke sub category for item management workflow',
      isActive: true
    }
  );

  const itemBusinessType = await upsertBySave(
    BusinessType,
    { name: 'Medicine' },
    {
      name: 'Medicine',
      description: 'QA smoke business type for item management workflow',
      isActive: true
    }
  );

  const itemFormula = await upsertBySave(
    Formula,
    { name: 'Smoke Formula' },
    {
      name: 'Smoke Formula',
      composition: 'Smoke Active Ingredient',
      description: 'QA smoke formula for item management workflow',
      isActive: true
    }
  );

  const itemFormulaSize = await upsertBySave(
    FormulaSize,
    { formulaId: itemFormula._id, size: '250mg' },
    {
      formulaId: itemFormula._id,
      size: '250mg',
      strength: '250mg',
      description: 'QA smoke formula size for item management workflow',
      isActive: true
    }
  );

  const cashAccount = await upsertBySave(
    Account,
    { code: 'SMOKE_CASH' },
    {
      name: 'Smoke Cash Account',
      code: 'SMOKE_CASH',
      accountType: 'asset',
      description: 'QA smoke cash ledger account',
      isActive: true,
      isSystemAccount: true,
      balance: 100000,
      createdBy: user._id,
      updatedBy: user._id
    }
  );

  await upsertBySave(
    Account,
    { code: 'SMOKE_BANK' },
    {
      name: 'Smoke Bank Account',
      code: 'SMOKE_BANK',
      accountType: 'asset',
      description: 'QA smoke bank ledger account',
      isActive: true,
      isSystemAccount: true,
      balance: 50000,
      createdBy: user._id,
      updatedBy: user._id
    }
  );

  const customer = await upsertBySave(
    Customer,
    { code: 'SMOKECUST' },
    {
      code: 'SMOKECUST',
      name: 'Smoke Customer',
      type: 'regular',
      accountType: 'customer',
      townId: town._id,
      areaId: plannedArea._id,
      contactInfo: {
        phone: '03000000001',
        mobile: '03000000001',
        email: 'smoke.customer@indus.pk',
        address: 'Smoke customer address',
        city: 'Karachi',
        country: 'Pakistan'
      },
      financialInfo: {
        creditLimit: 50000,
        paymentTerms: 30,
        creditDays: 30,
        currency: 'PKR',
        advanceTaxRate: 0,
        isNonFiler: false
      },
      isActive: true
    }
  );

  const recoveryCustomer = await upsertBySave(
    Customer,
    { code: 'SMOKEREC' },
    {
      code: 'SMOKEREC',
      name: 'Smoke Recovery Customer',
      type: 'regular',
      accountType: 'customer',
      townId: town._id,
      areaId: plannedArea._id,
      contactInfo: {
        phone: '03000000005',
        mobile: '03000000005',
        email: 'smoke.recovery.customer@indus.pk',
        address: 'Smoke recovery customer address',
        city: 'Karachi',
        country: 'Pakistan'
      },
      financialInfo: {
        creditLimit: 25000,
        paymentTerms: 30,
        creditDays: 30,
        currency: 'PKR',
        advanceTaxRate: 0,
        isNonFiler: false
      },
      isActive: true
    }
  );

  const cashbookCustomer = await upsertBySave(
    Customer,
    { code: 'SMOKECB' },
    {
      code: 'SMOKECB',
      name: 'Smoke Cashbook Customer',
      type: 'regular',
      accountType: 'customer',
      townId: town._id,
      areaId: plannedArea._id,
      contactInfo: {
        phone: '03000000006',
        mobile: '03000000006',
        email: 'smoke.cashbook.customer@indus.pk',
        address: 'Smoke cashbook customer address',
        city: 'Karachi',
        country: 'Pakistan'
      },
      financialInfo: {
        creditLimit: 30000,
        paymentTerms: 30,
        creditDays: 30,
        currency: 'PKR',
        advanceTaxRate: 0,
        isNonFiler: false
      },
      isActive: true
    }
  );

  const employee = await upsertBySave(
    Customer,
    { code: 'SMOKEEMP' },
    {
      code: 'SMOKEEMP',
      name: 'Smoke Employee Account',
      type: 'regular',
      accountType: 'employee',
      employeeAccountType: 'employee_account',
      employeeBiodata: {
        basicPay: 50000,
        designation: 'Smoke Sales Officer',
        dateOfJoining: new Date('2026-01-01')
      },
      contactInfo: {
        mobile: '03000000003',
        email: 'smoke.employee@indus.pk',
        city: 'Karachi',
        country: 'Pakistan'
      },
      isActive: true
    }
  );

  const employeeUser = await upsertBySave(
    User,
    { username: 'smoke.salesman' },
    {
      username: 'smoke.salesman',
      email: 'smoke.salesman@indus.pk',
      password,
      role: 'salesman',
      accountId: employee._id,
      isActive: true
    }
  );

  const recoverySalesman = await upsertBySave(
    Salesman,
    { code: 'SMOKESM' },
    {
      code: 'SMOKESM',
      name: 'Smoke Recovery Salesman',
      phone: '03000000004',
      email: 'smoke.recovery.salesman@indus.pk',
      isActive: true,
      createdBy: user._id
    }
  );

  let salaryPackage = await SalaryPackage.findOne({ employeeId: employee._id }).sort({ createdAt: -1 });
  if (!salaryPackage) {
    salaryPackage = new SalaryPackage({
      employeeId: employee._id,
      createdBy: user._id
    });
  }
  salaryPackage.set({
    employeeId: employee._id,
    employeeName: employee.name,
    duration: {
      fromDate: periodStart,
      toDate: periodEnd
    },
    salesTarget: { targetAmount: 100, incentiveType: 'Fix Amount', incentiveValue: 200 },
    recoveryTarget: { targetAmount: 100, incentiveType: 'Fix Amount', incentiveValue: 150 },
    dailyAllowance: { type: 'Fix Amount', value: 0 },
    petrolAllowance: { type: 'Fix Amount', value: 0 },
    mobilePackage: { type: 'Fix Amount', value: 0 },
    mobileOrderIncentive: { type: 'Amount', value: 50 },
    mobileCashRecoveryIncentive: { type: '%', value: 10, verifyWithCashBook: true },
    partyVisitTarget: { numberOfOrders: 1, type: 'Fix Amount', value: 100 },
    eidFitrBonus: { month: 'March', type: 'Fix Amount', value: 0 },
    eidAdhaBonus: { month: 'June', type: 'Fix Amount', value: 0 },
    otherBonus: { detail: '', month: currentMonthName, type: 'Fix Amount', value: 0 },
    brandIncentives: [],
    status: 'Active',
    createdBy: salaryPackage.createdBy || user._id,
    updatedBy: user._id
  });
  await salaryPackage.save();

  await SalaryCalculation.deleteMany({
    employeeId: employee._id,
    month: currentMonthName,
    year: currentYear
  });

  await upsertBySave(
    RoutePlan,
    { monthYear: currentMonthYear, salesmanId: employeeUser._id },
    {
      monthYear: currentMonthYear,
      salesmanId: employeeUser._id,
      salesTarget: 100,
      recoveryTarget: 100,
      visitTarget: 1,
      days: [{ dayOfWeek: 'Monday', areaId: plannedArea._id }],
      createdBy: user._id
    }
  );

  const supplier = await upsertBySave(
    Supplier,
    { code: 'SMOKESUP' },
    {
      code: 'SMOKESUP',
      name: 'Smoke Supplier',
      type: 'supplier',
      contactInfo: {
        phone: '03000000002',
        email: 'smoke.supplier@indus.pk',
        address: 'Smoke supplier address',
        city: 'Karachi',
        country: 'Pakistan'
      },
      financialInfo: {
        creditLimit: 75000,
        paymentTerms: 30,
        creditDays: 30,
        currency: 'PKR',
        advanceTaxRate: 0,
        isNonFiler: false
      },
      isActive: true
    }
  );

  const warehouse = await upsertBySave(
    Warehouse,
    { code: 'SMWH' },
    {
      code: 'SMWH',
      name: 'Smoke Main Warehouse',
      location: {
        address: 'Smoke warehouse address',
        city: 'Karachi',
        country: 'Pakistan'
      },
      contact: {
        phone: '0210000000',
        email: 'smoke.warehouse@indus.pk'
      },
      manager: user._id,
      isActive: true
    }
  );

  const item = await upsertBySave(
    Item,
    { code: 'SMOKEITEM' },
    {
      code: 'SMOKEITEM',
      name: 'Smoke Test Item',
      companyId: itemCompany._id,
      businessTypeId: itemBusinessType._id,
      categoryId: itemCategory._id,
      subCategoryId: itemSubCategory._id,
      formulaId: itemFormula._id,
      formulaSizeId: itemFormulaSize._id,
      unit: 'piece',
      pricing: {
        purchasePrice: 80,
        costPrice: 80,
        salePrice: 120,
        tradePrice: 100,
        retailPrice: 125,
        currency: 'PKR'
      },
      tax: {
        taxType: 'GST',
        gstRate: 18,
        gstRateNonFilter: 0,
        taxCategory: 'standard'
      },
      inventory: {
        openingStock: 50,
        currentStock: 50,
        minimumStock: 5,
        maximumStock: 500,
        reorderPoint: 10,
        batches: [
          {
            batchNumber: 'SMB-001',
            expiryDate: new Date('2099-12-31'),
            stock: 50,
            costPrice: 80,
            salePrice: 120
          }
        ]
      },
      packSize: 1,
      packingSize: '1x1',
      supplier: {
        primarySupplierId: supplier._id,
        supplierItemCode: 'SUP-SMOKE-001'
      },
      barcode: 'SMOKE-BARCODE-001',
      isActive: true
    }
  );

  await upsertBySave(
    Inventory,
    { item: item._id, warehouse: warehouse._id, batchNumber: 'SMB-001' },
    {
      item: item._id,
      warehouse: warehouse._id,
      batchNumber: 'SMB-001',
      quantity: 50,
      reservedQuantity: 0,
      allocated: 0,
      reorderPoint: 10,
      notes: 'Seeded for QA browser smoke'
    }
  );

  const salesInvoice = await upsertBySave(
    Invoice,
    { invoiceNumber: 'SMOKE-SI-001' },
    {
      invoiceNumber: 'SMOKE-SI-001',
      type: 'sales',
      invoiceSource: 'admin',
      customerId: customer._id,
      status: 'confirmed',
      paymentStatus: 'pending',
      invoiceDate: monthDay(5),
      dueDate: monthDay(28),
      salesmanId: employee._id,
      taxInvoiceType: 'sales_tax',
      items: [
        {
          itemId: item._id,
          itemName: item.name,
          quantity: 1,
          unitPrice: 120,
          lineTotal: 120,
          warehouseId: warehouse._id,
          batchInfo: {
            batchNumber: 'SMB-001',
            expiryDate: new Date('2099-12-31')
          },
          boxQuantity: 0,
          unitQuantity: 1,
          unitRate: 120,
          gstRate: 18,
          gstAmount: 21.6
        }
      ],
      totals: {
        subtotal: 120,
        grossTotal: 120,
        totalTax: 21.6,
        grandTotal: 141.6,
        netBillTotal: 141.6,
        gst18Total: 21.6,
        paidAmount: 0,
        dueAmount: 141.6
      },
      createdBy: user._id
    }
  );

  const recoveryInvoice = await upsertBySave(
    Invoice,
    { invoiceNumber: 'SMOKE-SI-REC-001' },
    {
      invoiceNumber: 'SMOKE-SI-REC-001',
      type: 'sales',
      invoiceSource: 'admin',
      customerId: recoveryCustomer._id,
      status: 'confirmed',
      paymentStatus: 'partial',
      invoiceDate: monthDay(6),
      dueDate: monthDay(20),
      salesmanId: recoverySalesman._id,
      taxInvoiceType: 'sales_tax',
      items: [
        {
          itemId: item._id,
          itemName: item.name,
          quantity: 1,
          unitPrice: 200,
          lineTotal: 200,
          warehouseId: warehouse._id,
          batchInfo: {
            batchNumber: 'SMB-001',
            expiryDate: new Date('2099-12-31')
          },
          boxQuantity: 0,
          unitQuantity: 1,
          unitRate: 200,
          gstRate: 0,
          gstAmount: 0
        }
      ],
      totals: {
        subtotal: 200,
        grossTotal: 200,
        totalTax: 0,
        grandTotal: 200,
        netBillTotal: 200,
        paidAmount: 50,
        dueAmount: 150
      },
      createdBy: user._id
    }
  );

  await upsertBySave(
    Invoice,
    { invoiceNumber: 'SMOKE-SI-CB-001' },
    {
      invoiceNumber: 'SMOKE-SI-CB-001',
      type: 'sales',
      invoiceSource: 'admin',
      customerId: cashbookCustomer._id,
      status: 'confirmed',
      paymentStatus: 'pending',
      invoiceDate: monthDay(10),
      dueDate: monthDay(25),
      salesmanId: recoverySalesman._id,
      taxInvoiceType: 'sales_tax',
      items: [
        {
          itemId: item._id,
          itemName: item.name,
          quantity: 1,
          unitPrice: 180,
          lineTotal: 180,
          warehouseId: warehouse._id,
          batchInfo: {
            batchNumber: 'SMB-001',
            expiryDate: new Date('2099-12-31')
          },
          boxQuantity: 0,
          unitQuantity: 1,
          unitRate: 180,
          gstRate: 0,
          gstAmount: 0
        }
      ],
      totals: {
        subtotal: 180,
        grossTotal: 180,
        totalTax: 0,
        grandTotal: 180,
        netBillTotal: 180,
        paidAmount: 0,
        dueAmount: 180
      },
      createdBy: user._id
    }
  );

  await upsertBySave(
    Invoice,
    { invoiceNumber: 'SMOKE-PI-001' },
    {
      invoiceNumber: 'SMOKE-PI-001',
      type: 'purchase',
      invoiceSource: 'admin',
      supplierId: supplier._id,
      supplierBillNo: 'SMOKE-BILL-001',
      status: 'confirmed',
      paymentStatus: 'pending',
      invoiceDate: monthDay(5),
      dueDate: monthDay(28),
      items: [
        {
          itemId: item._id,
          itemName: item.name,
          quantity: 1,
          unitPrice: 80,
          lineTotal: 80,
          warehouseId: warehouse._id,
          batchInfo: {
            batchNumber: 'SMB-001',
            expiryDate: new Date('2099-12-31')
          },
          boxQuantity: 0,
          unitQuantity: 1,
          unitRate: 80,
          gstRate: 18,
          gstAmount: 14.4
        }
      ],
      totals: {
        subtotal: 80,
        grossTotal: 80,
        totalTax: 14.4,
        grandTotal: 94.4,
        netBillTotal: 94.4,
        gst18Total: 14.4,
        paidAmount: 0,
        dueAmount: 94.4
      },
      createdBy: user._id
    }
  );

  await upsertBySave(
    PurchaseOrder,
    { poNumber: 'SMOKE-PO-001' },
    {
      poNumber: 'SMOKE-PO-001',
      poDate: monthDay(5),
      supplierId: supplier._id,
      supplierName: supplier.name,
      billNo: 'SMOKE-PO-BILL-001',
      status: 'confirmed',
      items: [
        {
          itemId: item._id,
          itemName: item.name,
          boxPacking: 1,
          boxQty: 0,
          unitQty: 2,
          boxTP: 0,
          unitTP: 80,
          discount: 0,
          netAmount: 160
        }
      ],
      totalAmount: 160,
      createdBy: user._id
    }
  );

  await upsertBySave(
    CashReceipt,
    { receiptNumber: 'SMOKE-CR-SALARY-001' },
    {
      receiptNumber: 'SMOKE-CR-SALARY-001',
      receiptDate: monthDay(9),
      customerId: customer._id,
      amount: 500,
      paymentMethod: 'cash',
      status: 'cleared',
      invoiceAllocations: [
        {
          invoiceId: salesInvoice._id,
          invoiceNumber: salesInvoice.invoiceNumber,
          amount: 141.6
        }
      ],
      invoicePayments: [
        {
          invoiceId: salesInvoice._id,
          invoiceNumber: salesInvoice.invoiceNumber,
          daysOld: 0,
          dueAmount: salesInvoice.totals.dueAmount,
          paidAmount: 141.6,
          difference: 0
        }
      ],
      totalAllocated: 141.6,
      difference: 358.4,
      cashAccountId: cashAccount._id,
      salesmanId: employee._id,
      createdBy: employeeUser._id,
      notes: 'Seeded cleared receipt for salary/targets smoke proof'
    }
  );

  await upsertBySave(
    CashReceipt,
    { receiptNumber: 'SMOKE-CR-RECOVERY-001' },
    {
      receiptNumber: 'SMOKE-CR-RECOVERY-001',
      receiptDate: monthDay(8),
      customerId: recoveryCustomer._id,
      amount: 50,
      paymentMethod: 'cash',
      status: 'cleared',
      invoiceAllocations: [
        {
          invoiceId: recoveryInvoice._id,
          invoiceNumber: recoveryInvoice.invoiceNumber,
          amount: 50
        }
      ],
      invoicePayments: [
        {
          invoiceId: recoveryInvoice._id,
          invoiceNumber: recoveryInvoice.invoiceNumber,
          daysOld: 0,
          dueAmount: recoveryInvoice.totals.dueAmount,
          paidAmount: 50,
          difference: 0
        }
      ],
      totalAllocated: 50,
      difference: 0,
      cashAccountId: cashAccount._id,
      salesmanId: recoverySalesman._id,
      createdBy: user._id,
      notes: 'Seeded receipt for recovery summary browser proof'
    }
  );

  await upsertBySave(
    EOrder,
    { orderNumber: 'SMOKE-EO-001' },
    {
      orderNumber: 'SMOKE-EO-001',
      orderDate: monthDay(7),
      customerId: customer._id,
      customerName: customer.name,
      customerTown: town.name,
      salesmanId: employee._id,
      items: [
        {
          itemId: item._id,
          itemName: item.name,
          boxPacking: 1,
          boxQuantity: 1,
          unitQuantity: 0,
          unitPrice: 120,
          rateWithGST: 141.6,
          gstRate: 18,
          gstAmount: 21.6,
          lineTotal: 120,
          availableQuantity: 50
        }
      ],
      subtotal: 120,
      totalDiscount: 0,
      totalGST: 21.6,
      grandTotal: 141.6,
      estimatedAmount: 141.6,
      status: 'approved',
      approvedBy: user._id,
      approvedAt: monthDay(7),
      mobileSync: {
        isSynced: true,
        syncedAt: monthDay(7),
        deviceId: 'smoke-device-001',
        offlineCreated: true
      },
      createdBy: employeeUser._id,
      notes: 'Seeded mobile order for salary/targets smoke proof'
    }
  );

  await upsertBySave(
    CashReceipt,
    { receiptNumber: 'SMOKE-PDC-001' },
    {
      receiptNumber: 'SMOKE-PDC-001',
      receiptDate: monthDay(12),
      customerId: customer._id,
      amount: 25,
      paymentMethod: 'cheque',
      referenceNumber: 'SMOKE-REF-001',
      postDatedCheque: true,
      bankDetails: {
        bankName: 'Smoke Bank',
        chequeNumber: 'SMOKE-CHQ-001',
        chequeDate: new Date('2099-05-15')
      },
      chequeStatus: 'pending',
      invoiceAllocations: [
        {
          invoiceId: salesInvoice._id,
          invoiceNumber: salesInvoice.invoiceNumber,
          amount: 25
        }
      ],
      invoicePayments: [
        {
          invoiceId: salesInvoice._id,
          invoiceNumber: salesInvoice.invoiceNumber,
          daysOld: 0,
          dueAmount: salesInvoice.totals.dueAmount,
          paidAmount: 25,
          difference: salesInvoice.totals.dueAmount - 25
        }
      ],
      totalAllocated: 25,
      difference: 0,
      status: 'pending',
      cashAccountId: cashAccount._id,
      createdBy: user._id,
      notes: 'Seeded PDC for QA browser smoke'
    }
  );

  console.log('Smoke data seeded.');
  console.log(`SMOKE_ADMIN_USERNAME=${user.username}`);
  console.log(`SMOKE_ADMIN_PASSWORD=${password}`);
  console.log(`SMOKE_CUSTOMER_CODE=${customer.code}`);
  console.log(`SMOKE_RECOVERY_CUSTOMER_CODE=${recoveryCustomer.code}`);
  console.log(`SMOKE_CASHBOOK_CUSTOMER_CODE=${cashbookCustomer.code}`);
  console.log(`SMOKE_SUPPLIER_CODE=${supplier.code}`);
  console.log(`SMOKE_EMPLOYEE_CODE=${employee.code}`);
  console.log(`SMOKE_SALESMAN_USERNAME=${employeeUser.username}`);
  console.log(`SMOKE_RECOVERY_SALESMAN_CODE=${recoverySalesman.code}`);
  console.log(`SMOKE_ITEM_CODE=${item.code}`);
  console.log(`SMOKE_WAREHOUSE_CODE=${warehouse.code}`);
  console.log(`SMOKE_DIMENSION_CODE=${dimension.code}`);
  console.log(`SMOKE_DESIGNATION_NAME=${designation.name}`);
  console.log(`SMOKE_CUSTOMER_TYPE_NAME=${customerType.name}`);
  console.log(`SMOKE_ACCOUNT_HEAD_CODE=${accountHead.code}`);
  console.log(`SMOKE_ITEM_COMPANY_CODE=${itemCompany.code}`);
  console.log(`SMOKE_ITEM_CATEGORY_NAME=${itemCategory.name}`);
  console.log(`SMOKE_ITEM_SUBCATEGORY_NAME=${itemSubCategory.name}`);
  console.log(`SMOKE_ITEM_BUSINESS_TYPE=${itemBusinessType.name}`);
  console.log(`SMOKE_ITEM_FORMULA_NAME=${itemFormula.name}`);
  console.log(`SMOKE_ITEM_FORMULA_SIZE=${itemFormulaSize.size}`);
}

if (require.main === module) {
  seedSmokeData()
    .then(() => mongoose.disconnect())
    .catch(async (error) => {
      console.error(error.message);
      await mongoose.disconnect().catch(() => {});
      process.exitCode = 1;
    });
}

module.exports = seedSmokeData;
