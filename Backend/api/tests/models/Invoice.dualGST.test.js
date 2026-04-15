const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Invoice = require('../../src/models/Invoice');
const Supplier = require('../../src/models/Supplier');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');

describe('Invoice Model - Dual GST Support (Task 1.1)', () => {
  let mongoServer;
  let supplier, item, item2, user;

  beforeAll(async () => {
    // Close any existing connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Invoice.deleteMany({});
    await Supplier.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});

    // Create test data
    supplier = await Supplier.create({
      name: 'Test Supplier',
      code: 'SUP001',
      type: 'supplier'
    });

    item = await Item.create({
      name: 'Standard Item',
      category: 'Electronics',
      unit: 'piece',
      pricing: { costPrice: 100, salePrice: 150 }
    });

    item2 = await Item.create({
      name: 'Essential Medicine',
      category: 'Pharmaceuticals',
      unit: 'box',
      pricing: { costPrice: 50, salePrice: 75 }
    });

    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });
  });

  describe('Purchase-specific fields', () => {
    it('should create purchase invoice with all purchase-specific fields', async () => {
      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-BILL-001',
        qualityControlNotes: 'All items inspected and approved',
        goodsReceiptNumber: 'GRN-2025-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180,
          gst18Total: 180,
          gst4Total: 0
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      const savedInvoice = await invoice.save();

      expect(savedInvoice.supplierBillNo).toBe('SUP-BILL-001');
      expect(savedInvoice.qualityControlNotes).toBe('All items inspected and approved');
      expect(savedInvoice.goodsReceiptNumber).toBe('GRN-2025-001');
      expect(savedInvoice.totals.gst18Total).toBe(180);
      expect(savedInvoice.totals.gst4Total).toBe(0);
    });

    it('should require supplierBillNo for purchase invoices', async () => {
      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        // Missing supplierBillNo
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000
          }
        ],
        totals: {
          subtotal: 1000,
          grandTotal: 1000
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await expect(invoice.save()).rejects.toThrow('Supplier bill number is required for purchase invoices');
    });
  });

  describe('Dual GST at item level', () => {
    it('should populate gst18Percent and gst18Amount for 18% GST items', async () => {
      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-BILL-002',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            lineTotal: 1180
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 180,
          grandTotal: 1180
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      // Verify the item has correct GST 18% fields populated
      expect(invoice.items[0].gst18Percent).toBe(18);
      expect(invoice.items[0].gst18Amount).toBe(180);
      expect(invoice.items[0].gst4Percent).toBe(0);
      expect(invoice.items[0].gst4Amount).toBe(0);
    });

    it('should populate gst4Percent and gst4Amount for 4% GST items', async () => {
      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-BILL-003',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            gstRate: 4,
            lineTotal: 1040
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 40,
          grandTotal: 1040
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      // Verify the item has correct GST 4% fields populated
      expect(invoice.items[0].gst18Percent).toBe(0);
      expect(invoice.items[0].gst18Amount).toBe(0);
      expect(invoice.items[0].gst4Percent).toBe(4);
      expect(invoice.items[0].gst4Amount).toBe(40);
    });

    it('should support mixed GST rates (18% and 4%) in same invoice', async () => {
      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-BILL-004',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            gstRate: 18,
            lineTotal: 1180
          },
          {
            itemId: item2._id,
            quantity: 20,
            unitPrice: 50,
            discount: 0,
            gstRate: 4,
            lineTotal: 1040
          }
        ],
        totals: {
          subtotal: 2000,
          totalDiscount: 0,
          totalTax: 220,
          grandTotal: 2220
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      // Verify first item (18% GST)
      expect(invoice.items[0].gst18Percent).toBe(18);
      expect(invoice.items[0].gst18Amount).toBe(180);
      expect(invoice.items[0].gst4Percent).toBe(0);
      expect(invoice.items[0].gst4Amount).toBe(0);

      // Verify second item (4% GST)
      expect(invoice.items[1].gst18Percent).toBe(0);
      expect(invoice.items[1].gst18Amount).toBe(0);
      expect(invoice.items[1].gst4Percent).toBe(4);
      expect(invoice.items[1].gst4Amount).toBe(40);

      // Verify totals
      expect(invoice.totals.gst18Total).toBe(180);
      expect(invoice.totals.gst4Total).toBe(40);
      expect(invoice.totals.totalTax).toBe(220);
    });

    it('should calculate GST amounts correctly with discounts', async () => {
      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-BILL-005',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            discount: 10, // 10% discount
            gstRate: 18,
            lineTotal: 1062
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 100,
          totalTax: 162,
          grandTotal: 1062
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      // GST should be calculated on taxable amount (1000 - 100 = 900)
      // 900 * 0.18 = 162
      expect(invoice.items[0].gst18Amount).toBe(162);
      expect(invoice.items[0].gst4Amount).toBe(0);
      expect(invoice.totals.gst18Total).toBe(162);
    });

    it('should set GST fields to 0 when no GST rate is applied', async () => {
      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-BILL-006',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            discount: 0,
            gstRate: 0, // No GST
            lineTotal: 1000
          }
        ],
        totals: {
          subtotal: 1000,
          totalDiscount: 0,
          totalTax: 0,
          grandTotal: 1000
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();

      expect(invoice.items[0].gst18Percent).toBe(0);
      expect(invoice.items[0].gst18Amount).toBe(0);
      expect(invoice.items[0].gst4Percent).toBe(0);
      expect(invoice.items[0].gst4Amount).toBe(0);
      expect(invoice.totals.gst18Total).toBe(0);
      expect(invoice.totals.gst4Total).toBe(0);
    });
  });

  describe('Field validations', () => {
    it('should validate qualityControlNotes maxlength', async () => {
      const longNotes = 'a'.repeat(1001); // Exceeds 1000 character limit

      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-BILL-007',
        qualityControlNotes: longNotes,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000
          }
        ],
        totals: {
          subtotal: 1000,
          grandTotal: 1000
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await expect(invoice.save()).rejects.toThrow();
    });

    it('should validate goodsReceiptNumber maxlength', async () => {
      const longGRN = 'a'.repeat(101); // Exceeds 100 character limit

      const invoiceData = {
        type: 'purchase',
        supplierId: supplier._id,
        supplierBillNo: 'SUP-BILL-008',
        goodsReceiptNumber: longGRN,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [
          {
            itemId: item._id,
            quantity: 10,
            unitPrice: 100,
            lineTotal: 1000
          }
        ],
        totals: {
          subtotal: 1000,
          grandTotal: 1000
        },
        createdBy: user._id
      };

      const invoice = new Invoice(invoiceData);
      await expect(invoice.save()).rejects.toThrow();
    });

    it('should accept valid gst18Percent enum values', async () => {
      const validValues = [0, 18];

      for (const value of validValues) {
        const invoiceData = {
          type: 'purchase',
          supplierId: supplier._id,
          supplierBillNo: `SUP-BILL-${value}`,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: [
            {
              itemId: item._id,
              quantity: 10,
              unitPrice: 100,
              gstRate: value === 18 ? 18 : 0,
              lineTotal: value === 18 ? 1180 : 1000
            }
          ],
          totals: {
            subtotal: 1000,
            grandTotal: value === 18 ? 1180 : 1000
          },
          createdBy: user._id
        };

        const invoice = new Invoice(invoiceData);
        const savedInvoice = await invoice.save();
        expect(savedInvoice.items[0].gst18Percent).toBe(value);
        
        await Invoice.findByIdAndDelete(savedInvoice._id);
      }
    });

    it('should accept valid gst4Percent enum values', async () => {
      const validValues = [0, 4];

      for (const value of validValues) {
        const invoiceData = {
          type: 'purchase',
          supplierId: supplier._id,
          supplierBillNo: `SUP-BILL-4-${value}`,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: [
            {
              itemId: item._id,
              quantity: 10,
              unitPrice: 100,
              gstRate: value === 4 ? 4 : 0,
              lineTotal: value === 4 ? 1040 : 1000
            }
          ],
          totals: {
            subtotal: 1000,
            grandTotal: value === 4 ? 1040 : 1000
          },
          createdBy: user._id
        };

        const invoice = new Invoice(invoiceData);
        const savedInvoice = await invoice.save();
        expect(savedInvoice.items[0].gst4Percent).toBe(value);
        
        await Invoice.findByIdAndDelete(savedInvoice._id);
      }
    });
  });
});
