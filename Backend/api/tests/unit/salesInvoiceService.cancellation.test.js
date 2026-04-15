const mongoose = require('mongoose');
const salesInvoiceService = require('../../src/services/salesInvoiceService');
const Invoice = require('../../src/models/Invoice');
const Customer = require('../../src/models/Customer');
const Item = require('../../src/models/Item');
const Warehouse = require('../../src/models/Warehouse');
const StockMovement = require('../../src/models/StockMovement');
const LedgerEntry = require('../../src/models/LedgerEntry');
const Inventory = require('../../src/models/Inventory');
const batchService = require('../../src/services/batchService');
const AppError = require('../../src/utils/appError');

describe('Sales Invoice Service - Cancellation Workflow', () => {
  let testCustomer;
  let testItem;
  let testWarehouse;
  let testUser;
  let confirmedInvoice;

  beforeAll(async () => {
    // Connect to test database
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

    // Create test user
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

    // Create test dependencies for Item
    const testCompany = new mongoose.Types.ObjectId();
    const testCategory = new mongoose.Types.ObjectId();
    const testBusinessType = new mongoose.Types.ObjectId();

    // Create test item
    testItem = await Item.create({
      name: 'Test Medicine',
      code: 'MED001',
      companyId: testCompany,
      businessTypeId: testBusinessType,
      categoryId: testCategory,
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
      unitTP: 100,
      boxTP: 1000,
      gstRate: 18,
      createdBy: testUser
    });

    // Create inventory
    await Inventory.create({
      item: testItem._id,
      warehouse: testWarehouse._id,
      quantity: 1000
    });

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
    confirmedInvoice = await salesInvoiceService.confirmInvoice(createdInvoice._id, testUser);
  });

  describe('cancelInvoice', () => {
    it('should successfully cancel a confirmed invoice', async () => {
      const result = await salesInvoiceService.cancelInvoice(
        confirmedInvoice._id,
        testUser,
        'Customer requested cancellation'
      );

      expect(result.status).toBe('cancelled');
      expect(result.cancelledAt).toBeDefined();
      expect(result.cancelledBy.toString()).toBe(testUser.toString());
      expect(result.cancellationReason).toBe('Customer requested cancellation');
    });

    it('should reverse stock movements when cancelling invoice', async () => {
      const stockMovementsBefore = await StockMovement.find({
        referenceId: confirmedInvoice._id
      });

      await salesInvoiceService.cancelInvoice(confirmedInvoice._id, testUser, 'Test cancellation');

      const stockMovementsAfter = await StockMovement.find({
        referenceId: confirmedInvoice._id
      });

      // Should have original 'out' movements plus new 'in' movements
      expect(stockMovementsAfter.length).toBe(stockMovementsBefore.length * 2);

      // Check for reverse movement
      const reverseMovement = stockMovementsAfter.find(
        m => m.movementType === 'in' && m.referenceType === 'sales_invoice_cancellation'
      );
      expect(reverseMovement).toBeDefined();
      expect(reverseMovement.quantity).toBe(65); // 60 (5 boxes * 10 + 10 units) + 5 scheme units
    });

    it('should restore item stock levels when cancelling invoice', async () => {
      const inventoryBefore = await Inventory.findOne({
        item: testItem._id,
        warehouse: testWarehouse._id
      });

      await salesInvoiceService.cancelInvoice(confirmedInvoice._id, testUser);

      const inventoryAfter = await Inventory.findOne({
        item: testItem._id,
        warehouse: testWarehouse._id
      });

      // Stock should be restored
      expect(inventoryAfter.quantity).toBe(inventoryBefore.quantity + 65);
    });

    it('should reverse customer balance when cancelling invoice', async () => {
      const customerBefore = await Customer.findById(testCustomer._id);
      const balanceBefore = customerBefore.currentBalance;

      await salesInvoiceService.cancelInvoice(confirmedInvoice._id, testUser);

      const customerAfter = await Customer.findById(testCustomer._id);

      // Balance should be reduced by invoice total
      expect(customerAfter.currentBalance).toBe(balanceBefore - confirmedInvoice.totals.netBillTotal);
    });

    it('should create reverse ledger entries when cancelling invoice', async () => {
      const ledgerEntriesBefore = await LedgerEntry.find({
        referenceId: confirmedInvoice._id
      });

      await salesInvoiceService.cancelInvoice(confirmedInvoice._id, testUser);

      const ledgerEntriesAfter = await LedgerEntry.find({
        referenceId: confirmedInvoice._id
      });

      // Should have original entries plus reverse entries
      expect(ledgerEntriesAfter.length).toBeGreaterThan(ledgerEntriesBefore.length);

      // Check for reverse customer entry (credit)
      const reverseCustomerEntry = ledgerEntriesAfter.find(
        e => e.accountId?.toString() === testCustomer._id.toString() &&
             e.entryType === 'credit' &&
             e.referenceType === 'sales_invoice_cancellation'
      );
      expect(reverseCustomerEntry).toBeDefined();
      expect(reverseCustomerEntry.amount).toBe(confirmedInvoice.totals.netBillTotal);

      // Check for reverse sales entry (debit)
      const reverseSalesEntry = ledgerEntriesAfter.find(
        e => e.accountType === 'Sales' &&
             e.entryType === 'debit' &&
             e.referenceType === 'sales_invoice_cancellation'
      );
      expect(reverseSalesEntry).toBeDefined();
    });

    it('should reverse GST ledger entries when cancelling invoice', async () => {
      await salesInvoiceService.cancelInvoice(confirmedInvoice._id, testUser);

      const gstReverseEntry = await LedgerEntry.findOne({
        referenceId: confirmedInvoice._id,
        accountType: 'GST_Payable',
        entryType: 'debit',
        referenceType: 'sales_invoice_cancellation'
      });

      expect(gstReverseEntry).toBeDefined();
      expect(gstReverseEntry.amount).toBe(confirmedInvoice.totals.gstTotal);
    });

    it('should reverse advance tax ledger entries when cancelling invoice', async () => {
      await salesInvoiceService.cancelInvoice(confirmedInvoice._id, testUser);

      const advanceTaxReverseEntry = await LedgerEntry.findOne({
        referenceId: confirmedInvoice._id,
        accountType: 'Advance_Tax_Payable',
        entryType: 'debit',
        referenceType: 'sales_invoice_cancellation'
      });

      expect(advanceTaxReverseEntry).toBeDefined();
      expect(advanceTaxReverseEntry.amount).toBe(confirmedInvoice.totals.advanceTaxTotal);
    });

    it('should restore batch quantities when cancelling invoice with batch tracking', async () => {
      // Create a batch-tracked invoice
      const batchNumber = 'BATCH001';
      
      // Mock batch service
      jest.spyOn(batchService, 'deductFromBatch').mockResolvedValue(true);
      jest.spyOn(batchService, 'returnToBatch').mockResolvedValue(true);

      const batchInvoiceData = {
        customerId: testCustomer._id,
        items: [{
          itemId: testItem._id,
          warehouseId: testWarehouse._id,
          batchNumber,
          boxQty: 2,
          unitQty: 5,
          boxTP: 1000,
          unitTP: 100
        }],
        creditDays: 30,
        status: 'draft'
      };

      const batchInvoice = await salesInvoiceService.createInvoice(batchInvoiceData, testUser);
      const confirmedBatchInvoice = await salesInvoiceService.confirmInvoice(batchInvoice._id, testUser);

      await salesInvoiceService.cancelInvoice(confirmedBatchInvoice._id, testUser);

      // Verify returnToBatch was called
      expect(batchService.returnToBatch).toHaveBeenCalledWith(
        batchNumber,
        25, // 2 boxes * 10 + 5 units
        expect.anything()
      );
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

    it('should throw error when trying to cancel already cancelled invoice', async () => {
      await salesInvoiceService.cancelInvoice(confirmedInvoice._id, testUser);

      await expect(
        salesInvoiceService.cancelInvoice(confirmedInvoice._id, testUser)
      ).rejects.toThrow('Only confirmed invoices can be cancelled');
    });

    it('should handle cancellation with claim account', async () => {
      // Create invoice with claim account
      const claimAccount = await Customer.create({
        name: 'Claim Account',
        code: 'CLAIM001',
        createdBy: testUser
      });

      const invoiceWithClaim = await salesInvoiceService.createInvoice({
        customerId: testCustomer._id,
        claimAccountId: claimAccount._id,
        items: [{
          itemId: testItem._id,
          warehouseId: testWarehouse._id,
          boxQty: 1,
          unitQty: 0,
          boxTP: 1000,
          unitTP: 100,
          discount2Percent: 5 // Claim discount
        }],
        status: 'draft'
      }, testUser);

      const confirmed = await salesInvoiceService.confirmInvoice(invoiceWithClaim._id, testUser);
      await salesInvoiceService.cancelInvoice(confirmed._id, testUser);

      // Check for reverse claim account entry (credit)
      const reverseClaimEntry = await LedgerEntry.findOne({
        referenceId: confirmed._id,
        accountId: claimAccount._id,
        accountType: 'Claim_Account',
        entryType: 'credit',
        referenceType: 'sales_invoice_cancellation'
      });

      expect(reverseClaimEntry).toBeDefined();
    });

    it('should rollback all changes if cancellation fails', async () => {
      // Mock a failure in the middle of the transaction
      jest.spyOn(LedgerEntry, 'create').mockRejectedValueOnce(new Error('Database error'));

      const inventoryBefore = await Inventory.findOne({
        item: testItem._id,
        warehouse: testWarehouse._id
      });

      const customerBefore = await Customer.findById(testCustomer._id);

      await expect(
        salesInvoiceService.cancelInvoice(confirmedInvoice._id, testUser)
      ).rejects.toThrow('Failed to cancel invoice');

      // Verify nothing changed
      const inventoryAfter = await Inventory.findOne({
        item: testItem._id,
        warehouse: testWarehouse._id
      });

      const customerAfter = await Customer.findById(testCustomer._id);
      const invoiceAfter = await Invoice.findById(confirmedInvoice._id);

      expect(inventoryAfter.quantity).toBe(inventoryBefore.quantity);
      expect(customerAfter.currentBalance).toBe(customerBefore.currentBalance);
      expect(invoiceAfter.status).toBe('confirmed'); // Still confirmed
    });

    it('should include cancellation reason in stock movement notes', async () => {
      const reason = 'Duplicate order';
      await salesInvoiceService.cancelInvoice(confirmedInvoice._id, testUser, reason);

      const reverseMovement = await StockMovement.findOne({
        referenceId: confirmedInvoice._id,
        referenceType: 'sales_invoice_cancellation'
      });

      expect(reverseMovement.notes).toContain(reason);
    });

    it('should handle cancellation with non-filer GST', async () => {
      // Create non-filer customer
      const nonFilerCustomer = await Customer.create({
        name: 'Non-Filer Customer',
        code: 'NONFILER001',
        registrationStatus: 'non_filer',
        creditLimit: 50000,
        currentBalance: 0,
        createdBy: testUser
      });

      const nonFilerInvoice = await salesInvoiceService.createInvoice({
        customerId: nonFilerCustomer._id,
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

      const confirmed = await salesInvoiceService.confirmInvoice(nonFilerInvoice._id, testUser);
      
      // Check if non-filer GST was applied
      if (confirmed.totals.nonFilerGst > 0) {
        await salesInvoiceService.cancelInvoice(confirmed._id, testUser);

        // Check for reverse non-filer GST entry
        const reverseNonFilerEntry = await LedgerEntry.findOne({
          referenceId: confirmed._id,
          accountType: 'NonFiler_GST_Payable',
          entryType: 'debit',
          referenceType: 'sales_invoice_cancellation'
        });

        expect(reverseNonFilerEntry).toBeDefined();
        expect(reverseNonFilerEntry.amount).toBe(confirmed.totals.nonFilerGst);
      }
    });
  });
});
