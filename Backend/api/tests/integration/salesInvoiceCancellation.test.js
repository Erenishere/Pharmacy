const mongoose = require('mongoose');
const salesInvoiceService = require('../../src/services/salesInvoiceService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const Warehouse = require('../../src/models/Warehouse');
const StockMovement = require('../../src/models/StockMovement');
const LedgerEntry = require('../../src/models/LedgerEntry');
const Inventory = require('../../src/models/Inventory');

describe('Sales Invoice Cancellation - Integration Test', () => {
  let testCustomer;
  let testItem;
  let testWarehouse;
  let testUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/indus_traders_test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections
    await Invoice.deleteMany({});
    await Customer.deleteMany({});
    await Item.deleteMany({});
    await Warehouse.deleteMany({});
    await StockMovement.deleteMany({});
    await LedgerEntry.deleteMany({});
    await Inventory.deleteMany({});

    testUser = new mongoose.Types.ObjectId();

    // Create test customer
    testCustomer = await Customer.create({
      name: 'Test Customer',
      code: 'CUST001',
      town: 'Test Town',
      creditLimit: 100000,
      currentBalance: 0,
      registrationStatus: 'filer',
      createdBy: testUser
    });

    // Create test warehouse
    testWarehouse = await Warehouse.create({
      name: 'Main Warehouse',
      code: 'WH001',
      location: {
        address: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        postalCode: '12345'
      },
      createdBy: testUser
    });

    // Create test item
    testItem = await Item.create({
      name: 'Test Medicine',
      code: 'MED001',
      companyId: new mongoose.Types.ObjectId(),
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      unit: 'tablet',
      packing: 10,
      pricing: {
        costPrice: 80,
        salePrice: 100,
        retailPrice: 120,
        wholesalePrice: 90,
        mrp: 150
      },
      inventory: {
        openingStock: 1000,
        currentStock: 1000,
        minimumStock: 100,
        maximumStock: 5000
      },
      tax: {
        taxType: 'GST',
        gstRate: 18
      },
      createdBy: testUser
    });

    // Create inventory
    await Inventory.create({
      item: testItem._id,
      warehouse: testWarehouse._id,
      quantity: 1000
    });
  });

  it('should successfully cancel a confirmed invoice and reverse all operations', async () => {
    // Create and confirm an invoice
    const invoiceData = {
      customerId: testCustomer._id,
      items: [{
        itemId: testItem._id,
        warehouseId: testWarehouse._id,
        boxQty: 5,
        unitQty: 10,
        boxTP: 1000,
        unitTP: 100,
        discount1Percent: 10,
        scheme1Qty: 5
      }],
      creditDays: 30,
      advanceTaxRate: 0.5,
      status: 'draft'
    };

    const createdInvoice = await salesInvoiceService.createInvoice(invoiceData, testUser);
    const confirmedInvoice = await salesInvoiceService.confirmInvoice(createdInvoice._id, testUser);

    // Get initial states
    const inventoryBefore = await Inventory.findOne({ item: testItem._id, warehouse: testWarehouse._id });
    const customerBefore = await Customer.findById(testCustomer._id);
    const stockMovementsBefore = await StockMovement.countDocuments({ referenceId: confirmedInvoice._id });
    const ledgerEntriesBefore = await LedgerEntry.countDocuments({ referenceId: confirmedInvoice._id });

    // Cancel the invoice
    const cancelledInvoice = await salesInvoiceService.cancelInvoice(
      confirmedInvoice._id,
      testUser,
      'Test cancellation'
    );

    // Verify invoice status
    expect(cancelledInvoice.status).toBe('cancelled');
    expect(cancelledInvoice.cancelledAt).toBeDefined();
    expect(cancelledInvoice.cancelledBy.toString()).toBe(testUser.toString());
    expect(cancelledInvoice.cancellationReason).toBe('Test cancellation');

    // Verify stock was restored
    const inventoryAfter = await Inventory.findOne({ item: testItem._id, warehouse: testWarehouse._id });
    expect(inventoryAfter.quantity).toBe(inventoryBefore.quantity + 65); // 60 + 5 scheme units

    // Verify customer balance was reversed
    const customerAfter = await Customer.findById(testCustomer._id);
    expect(customerAfter.currentBalance).toBe(customerBefore.currentBalance - confirmedInvoice.totals.netBillTotal);

    // Verify reverse stock movements were created
    const stockMovementsAfter = await StockMovement.countDocuments({ referenceId: confirmedInvoice._id });
    expect(stockMovementsAfter).toBe(stockMovementsBefore * 2); // Original + reverse

    // Verify reverse ledger entries were created
    const ledgerEntriesAfter = await LedgerEntry.countDocuments({ referenceId: confirmedInvoice._id });
    expect(ledgerEntriesAfter).toBeGreaterThan(ledgerEntriesBefore);

    console.log('✓ Invoice cancellation test passed successfully');
  });

  it('should throw error when trying to cancel draft invoice', async () => {
    const draftInvoice = await salesInvoiceService.createInvoice({
      customerId: testCustomer._id,
      items: [{
        itemId: testItem._id,
        warehouseId: testWarehouse._id,
        boxQty: 1,
        unitQty: 0,
        boxTP: 1000,
        unitTP: 100
      }],
      status: 'draft'
    }, testUser);

    await expect(
      salesInvoiceService.cancelInvoice(draftInvoice._id, testUser)
    ).rejects.toThrow('Only confirmed invoices can be cancelled');
  });
});
