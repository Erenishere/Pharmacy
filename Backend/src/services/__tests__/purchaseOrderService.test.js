const mongoose = require('mongoose');
const purchaseOrderService = require('../purchaseOrderService');
const PurchaseOrder = require('../../models/PurchaseOrder');
const Supplier = require('../../models/Supplier');
const Item = require('../../models/Item');

// Mock dependencies
jest.mock('../../models/PurchaseOrder');
jest.mock('../../models/Supplier');
jest.mock('../../models/Item');
jest.mock('../purchaseInvoiceService');

describe('PurchaseOrderService', () => {
  let mockUserId;
  let mockSupplierId;
  let mockItemId;
  let mockPOId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = new mongoose.Types.ObjectId();
    mockSupplierId = new mongoose.Types.ObjectId();
    mockItemId = new mongoose.Types.ObjectId();
    mockPOId = new mongoose.Types.ObjectId();
  });

  describe('generatePONumber', () => {
    // Requirement 4.1: Auto-generate unique PO number
    it('should generate unique PO number with correct format', async () => {
      const year = new Date().getFullYear();
      PurchaseOrder.generatePONumber = jest.fn().mockResolvedValue(`PO${year}000001`);

      const poNumber = await purchaseOrderService.generatePONumber();

      expect(poNumber).toBe(`PO${year}000001`);
      expect(PurchaseOrder.generatePONumber).toHaveBeenCalled();
    });

    it('should generate sequential PO numbers', async () => {
      const year = new Date().getFullYear();
      PurchaseOrder.generatePONumber = jest.fn()
        .mockResolvedValueOnce(`PO${year}000001`)
        .mockResolvedValueOnce(`PO${year}000002`);

      const poNumber1 = await purchaseOrderService.generatePONumber();
      const poNumber2 = await purchaseOrderService.generatePONumber();

      expect(poNumber1).toBe(`PO${year}000001`);
      expect(poNumber2).toBe(`PO${year}000002`);
    });
  });

  describe('createPurchaseOrder', () => {
    // Requirements 4.2-4.7: PO creation with items and calculations
    it('should create purchase order with auto-generated PO number', async () => {
      const year = new Date().getFullYear();
      const mockSupplier = {
        _id: mockSupplierId,
        name: 'Test Supplier',
        town: 'Test Town',
      };

      const mockItem = {
        _id: mockItemId,
        name: 'Test Item',
        code: 'TEST001',
      };

      const mockPO = {
        _id: mockPOId,
        poNumber: `PO${year}000001`,
        supplierId: mockSupplierId,
        items: [],
        status: 'draft',
      };

      Supplier.findById.mockResolvedValue(mockSupplier);
      Item.find.mockResolvedValue([mockItem]);
      PurchaseOrder.create.mockResolvedValue(mockPO);

      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPO),
      };

      PurchaseOrder.findById.mockReturnValue(mockPopulateChain);
      PurchaseOrder.generatePONumber = jest.fn().mockResolvedValue(`PO${year}000001`);

      const poData = {
        supplierId: mockSupplierId,
        poDate: new Date(),
        billNo: 'BILL001',
        items: [
          {
            itemId: mockItemId,
            itemName: 'Test Item',
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            discount: 5,
          },
        ],
        notes: 'Test PO',
      };

      const result = await purchaseOrderService.createPurchaseOrder(poData, mockUserId);

      expect(Supplier.findById).toHaveBeenCalledWith(mockSupplierId);
      expect(Item.find).toHaveBeenCalled();
      expect(PurchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: mockSupplierId,
          createdBy: mockUserId,
          status: 'draft',
        }),
      );
    });

    // Requirement 4.8: Set status to Draft
    it('should set initial status to draft', async () => {
      const mockSupplier = {
        _id: mockSupplierId,
        name: 'Test Supplier',
        town: 'Test Town',
      };

      const mockItem = {
        _id: mockItemId,
        name: 'Test Item',
      };

      Supplier.findById.mockResolvedValue(mockSupplier);
      Item.find.mockResolvedValue([mockItem]);
      PurchaseOrder.generatePONumber = jest.fn().mockResolvedValue('PO2025000001');

      const mockCreatedPO = {
        _id: mockPOId,
        status: 'draft',
      };

      PurchaseOrder.create.mockResolvedValue(mockCreatedPO);

      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockCreatedPO),
      };

      PurchaseOrder.findById.mockReturnValue(mockPopulateChain);

      const poData = {
        supplierId: mockSupplierId,
        items: [
          {
            itemId: mockItemId,
            itemName: 'Test Item',
            boxQty: 1,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
          },
        ],
      };

      await purchaseOrderService.createPurchaseOrder(poData, mockUserId);

      expect(PurchaseOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'draft',
        }),
      );
    });

    it('should throw error when supplier not found', async () => {
      Supplier.findById.mockResolvedValue(null);

      const poData = {
        supplierId: mockSupplierId,
        items: [],
      };

      await expect(
        purchaseOrderService.createPurchaseOrder(poData, mockUserId),
      ).rejects.toThrow('Supplier not found');
    });

    it('should throw error when items not found', async () => {
      const mockSupplier = {
        _id: mockSupplierId,
        name: 'Test Supplier',
      };

      Supplier.findById.mockResolvedValue(mockSupplier);
      Item.find.mockResolvedValue([]); // No items found

      const poData = {
        supplierId: mockSupplierId,
        items: [
          {
            itemId: mockItemId,
            itemName: 'Test Item',
          },
        ],
      };

      await expect(
        purchaseOrderService.createPurchaseOrder(poData, mockUserId),
      ).rejects.toThrow('One or more items not found');
    });
  });

  describe('getPurchaseOrders', () => {
    // Requirement 4.16: Search and filter by supplier, status, date
    it('should get purchase orders with filters and pagination', async () => {
      const mockPOs = [
        {
          _id: mockPOId,
          poNumber: 'PO2025000001',
          status: 'draft',
        },
      ];

      PurchaseOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPOs),
      });

      PurchaseOrder.countDocuments.mockResolvedValue(1);

      const filters = {
        status: 'draft',
        supplierId: mockSupplierId,
      };

      const pagination = {
        page: 1,
        limit: 50,
      };

      const result = await purchaseOrderService.getPurchaseOrders(filters, pagination);

      expect(result.purchaseOrders).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by date range', async () => {
      PurchaseOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      PurchaseOrder.countDocuments.mockResolvedValue(0);

      const filters = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      await purchaseOrderService.getPurchaseOrders(filters, {});

      expect(PurchaseOrder.find).toHaveBeenCalledWith(
        expect.objectContaining({
          poDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        }),
      );
    });

    it('should exclude deleted purchase orders', async () => {
      PurchaseOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      PurchaseOrder.countDocuments.mockResolvedValue(0);

      await purchaseOrderService.getPurchaseOrders({}, {});

      expect(PurchaseOrder.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: false,
        }),
      );
    });
  });

  describe('getPurchaseOrderById', () => {
    it('should get purchase order by ID with populated fields', async () => {
      const mockPO = {
        _id: mockPOId,
        poNumber: 'PO2025000001',
        status: 'draft',
      };

      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockPO),
      };

      PurchaseOrder.findOne.mockReturnValue(mockPopulateChain);

      const result = await purchaseOrderService.getPurchaseOrderById(mockPOId);

      expect(result).toEqual(mockPO);
      expect(PurchaseOrder.findOne).toHaveBeenCalledWith({
        _id: mockPOId,
        isDeleted: false,
      });
    });

    it('should throw error when purchase order not found', async () => {
      const mockPopulateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      PurchaseOrder.findOne.mockReturnValue(mockPopulateChain);

      await expect(
        purchaseOrderService.getPurchaseOrderById(mockPOId),
      ).rejects.toThrow('Purchase order not found');
    });
  });

  describe('updatePurchaseOrder', () => {
    it('should update draft purchase order', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'draft',
        items: [],
        save: jest.fn().mockResolvedValue(true),
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      jest.spyOn(purchaseOrderService, 'getPurchaseOrderById').mockResolvedValue(mockPO);

      const updates = {
        notes: 'Updated notes',
        billNo: 'BILL002',
      };

      const result = await purchaseOrderService.updatePurchaseOrder(
        mockPOId,
        updates,
        mockUserId,
      );

      expect(mockPO.save).toHaveBeenCalled();
      expect(mockPO.notes).toBe('Updated notes');
      expect(mockPO.billNo).toBe('BILL002');
    });

    it('should update items and recalculate totals', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'draft',
        items: [],
        save: jest.fn().mockResolvedValue(true),
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      jest.spyOn(purchaseOrderService, 'getPurchaseOrderById').mockResolvedValue(mockPO);

      const updates = {
        items: [
          {
            itemId: mockItemId,
            itemName: 'Updated Item',
            boxQty: 10,
            unitQty: 5,
            boxTP: 100,
            unitTP: 10,
          },
        ],
      };

      await purchaseOrderService.updatePurchaseOrder(mockPOId, updates, mockUserId);

      expect(mockPO.items).toHaveLength(1);
      expect(mockPO.save).toHaveBeenCalled();
    });

    it('should throw error when updating confirmed PO', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'confirmed',
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      const updates = {
        notes: 'Updated notes',
      };

      await expect(
        purchaseOrderService.updatePurchaseOrder(mockPOId, updates, mockUserId),
      ).rejects.toThrow('Cannot update purchase order with status: confirmed');
    });

    it('should throw error when PO not found', async () => {
      PurchaseOrder.findOne.mockResolvedValue(null);

      await expect(
        purchaseOrderService.updatePurchaseOrder(mockPOId, {}, mockUserId),
      ).rejects.toThrow('Purchase order not found');
    });

    it('should update supplier information when supplier changed', async () => {
      const newSupplierId = new mongoose.Types.ObjectId();
      const mockSupplier = {
        _id: newSupplierId,
        name: 'New Supplier',
        town: 'New Town',
      };

      const mockPO = {
        _id: mockPOId,
        status: 'draft',
        items: [],
        save: jest.fn().mockResolvedValue(true),
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);
      Supplier.findById.mockResolvedValue(mockSupplier);

      jest.spyOn(purchaseOrderService, 'getPurchaseOrderById').mockResolvedValue(mockPO);

      const updates = {
        supplierId: newSupplierId,
      };

      await purchaseOrderService.updatePurchaseOrder(mockPOId, updates, mockUserId);

      expect(mockPO.supplierName).toBe('New Supplier');
      expect(mockPO.supplierTown).toBe('New Town');
    });
  });

  describe('sendPurchaseOrder', () => {
    // Requirement 4.9: Update status to Sent
    it('should send draft purchase order and update status to sent', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'draft',
        save: jest.fn().mockResolvedValue(true),
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      jest.spyOn(purchaseOrderService, 'getPurchaseOrderById').mockResolvedValue({
        ...mockPO,
        status: 'sent',
      });

      const result = await purchaseOrderService.sendPurchaseOrder(mockPOId, mockUserId);

      expect(mockPO.status).toBe('sent');
      expect(mockPO.sentAt).toBeDefined();
      expect(mockPO.save).toHaveBeenCalled();
    });

    it('should throw error when PO is not draft', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'confirmed',
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      await expect(
        purchaseOrderService.sendPurchaseOrder(mockPOId, mockUserId),
      ).rejects.toThrow('Cannot send purchase order with status: confirmed');
    });

    it('should throw error when PO not found', async () => {
      PurchaseOrder.findOne.mockResolvedValue(null);

      await expect(
        purchaseOrderService.sendPurchaseOrder(mockPOId, mockUserId),
      ).rejects.toThrow('Purchase order not found');
    });
  });

  describe('confirmPurchaseOrder', () => {
    // Requirement 4.10: Update status to Confirmed
    it('should confirm purchase order and update status', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'sent',
        save: jest.fn().mockResolvedValue(true),
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      jest.spyOn(purchaseOrderService, 'getPurchaseOrderById').mockResolvedValue({
        ...mockPO,
        status: 'confirmed',
      });

      const result = await purchaseOrderService.confirmPurchaseOrder(mockPOId, mockUserId);

      expect(mockPO.status).toBe('confirmed');
      expect(mockPO.confirmedAt).toBeDefined();
      expect(mockPO.save).toHaveBeenCalled();
    });

    it('should throw error when PO already confirmed', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'confirmed',
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      await expect(
        purchaseOrderService.confirmPurchaseOrder(mockPOId, mockUserId),
      ).rejects.toThrow('Purchase order is already confirmed');
    });

    it('should throw error when PO is cancelled', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'cancelled',
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      await expect(
        purchaseOrderService.confirmPurchaseOrder(mockPOId, mockUserId),
      ).rejects.toThrow('Cannot confirm cancelled purchase order');
    });

    it('should throw error when PO not found', async () => {
      PurchaseOrder.findOne.mockResolvedValue(null);

      await expect(
        purchaseOrderService.confirmPurchaseOrder(mockPOId, mockUserId),
      ).rejects.toThrow('Purchase order not found');
    });
  });

  describe('convertToInvoice', () => {
    // Requirements 4.11-4.14: Convert PO to invoice with auto-fill
    it('should convert confirmed PO to invoice', async () => {
      const mockPO = {
        _id: mockPOId,
        poNumber: 'PO2025000001',
        status: 'confirmed',
        supplierId: {
          _id: mockSupplierId,
        },
        items: [
          {
            itemId: {
              _id: mockItemId,
            },
            itemName: 'Test Item',
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            discount: 5,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(),
        invoiceNumber: 'PI2025000001',
      };

      jest.spyOn(purchaseOrderService, 'getPurchaseOrderById').mockResolvedValue(mockPO);

      const purchaseInvoiceService = require('../purchaseInvoiceService');
      purchaseInvoiceService.createPurchaseInvoice = jest
        .fn()
        .mockResolvedValue(mockInvoice);

      const additionalData = {
        warehouseId: new mongoose.Types.ObjectId(),
        supplierBillNo: 'BILL001',
      };

      const result = await purchaseOrderService.convertToInvoice(
        mockPOId,
        mockUserId,
        additionalData,
      );

      // Requirement 4.12: Auto-fill all PO details
      expect(purchaseInvoiceService.createPurchaseInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: mockSupplierId,
          poNumber: 'PO2025000001',
          poId: mockPOId,
        }),
        mockUserId,
      );

      // Requirement 4.13: Update PO status to Received
      expect(mockPO.status).toBe('received');
      expect(mockPO.receivedAt).toBeDefined();

      // Requirement 4.14: Link invoice to PO
      expect(mockPO.convertedInvoiceId).toBe(mockInvoice._id);
      expect(mockPO.convertedAt).toBeDefined();
      expect(mockPO.save).toHaveBeenCalled();

      expect(result).toEqual(mockInvoice);
    });

    it('should throw error when PO not confirmed', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'draft',
      };

      jest.spyOn(purchaseOrderService, 'getPurchaseOrderById').mockResolvedValue(mockPO);

      await expect(
        purchaseOrderService.convertToInvoice(mockPOId, mockUserId),
      ).rejects.toThrow('Purchase order must be confirmed before conversion to invoice');
    });

    it('should throw error when PO already converted', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'confirmed',
        convertedInvoiceId: new mongoose.Types.ObjectId(),
      };

      jest.spyOn(purchaseOrderService, 'getPurchaseOrderById').mockResolvedValue(mockPO);

      await expect(
        purchaseOrderService.convertToInvoice(mockPOId, mockUserId),
      ).rejects.toThrow('Purchase order has already been converted to invoice');
    });

    it('should include optional fields in invoice data', async () => {
      const mockPO = {
        _id: mockPOId,
        poNumber: 'PO2025000001',
        status: 'confirmed',
        supplierId: {
          _id: mockSupplierId,
        },
        items: [
          {
            itemId: {
              _id: mockItemId,
            },
            itemName: 'Test Item',
            boxQty: 1,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockInvoice = {
        _id: new mongoose.Types.ObjectId(),
      };

      jest.spyOn(purchaseOrderService, 'getPurchaseOrderById').mockResolvedValue(mockPO);

      const purchaseInvoiceService = require('../purchaseInvoiceService');
      purchaseInvoiceService.createPurchaseInvoice = jest
        .fn()
        .mockResolvedValue(mockInvoice);

      const additionalData = {
        warehouseId: new mongoose.Types.ObjectId(),
        dimension: 'DIM001',
        biltyNo: 'BILTY001',
        qualityControlNotes: 'QC passed',
        goodsReceiptNumber: 'GRN001',
      };

      await purchaseOrderService.convertToInvoice(mockPOId, mockUserId, additionalData);

      expect(purchaseInvoiceService.createPurchaseInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          dimension: 'DIM001',
          biltyNo: 'BILTY001',
          qualityControlNotes: 'QC passed',
          goodsReceiptNumber: 'GRN001',
        }),
        mockUserId,
      );
    });
  });

  describe('getOutstandingPOs', () => {
    // Requirement 4.18: Outstanding PO report
    it('should get outstanding purchase orders', async () => {
      const mockPOs = [
        {
          _id: mockPOId,
          poNumber: 'PO2025000001',
          poDate: new Date(),
          status: 'sent',
          totalAmount: 10000,
          supplierId: {
            _id: mockSupplierId,
            name: 'Test Supplier',
            code: 'SUP001',
            contactPerson: 'John Doe',
            phone: '1234567890',
          },
          items: [
            {
              itemId: {
                _id: mockItemId,
                name: 'Test Item',
                code: 'ITEM001',
                unit: 'pcs',
              },
              boxQty: 10,
              unitQty: 5,
              receivedQuantity: 0,
              pendingQuantity: 105,
              unitTP: 100,
              netAmount: 10000,
            },
          ],
        },
      ];

      PurchaseOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPOs),
      });

      const result = await purchaseOrderService.getOutstandingPOs();

      expect(result.outstandingPOs).toHaveLength(1);
      expect(result.summary.totalPOs).toBe(1);
      expect(result.summary.totalPendingAmount).toBeGreaterThan(0);
    });

    it('should filter outstanding POs by supplier', async () => {
      PurchaseOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const filters = {
        supplierId: mockSupplierId,
      };

      await purchaseOrderService.getOutstandingPOs(filters);

      expect(PurchaseOrder.find).toHaveBeenCalledWith(
        expect.objectContaining({
          supplierId: mockSupplierId,
        }),
      );
    });

    it('should filter outstanding POs by date range', async () => {
      PurchaseOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const filters = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      await purchaseOrderService.getOutstandingPOs(filters);

      expect(PurchaseOrder.find).toHaveBeenCalledWith(
        expect.objectContaining({
          poDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        }),
      );
    });

    it('should only include sent and confirmed POs', async () => {
      PurchaseOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      await purchaseOrderService.getOutstandingPOs();

      expect(PurchaseOrder.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $in: ['sent', 'confirmed'] },
        }),
      );
    });

    it('should calculate summary statistics correctly', async () => {
      const mockPOs = [
        {
          _id: mockPOId,
          poNumber: 'PO2025000001',
          poDate: new Date(),
          status: 'sent',
          totalAmount: 10000,
          supplierId: {
            _id: mockSupplierId,
            name: 'Test Supplier',
            code: 'SUP001',
          },
          items: [
            {
              itemId: {
                _id: mockItemId,
                name: 'Test Item',
                code: 'ITEM001',
                unit: 'pcs',
              },
              boxQty: 10,
              unitQty: 0,
              receivedQuantity: 0,
              pendingQuantity: 100,
              unitTP: 100,
              netAmount: 10000,
            },
          ],
        },
        {
          _id: new mongoose.Types.ObjectId(),
          poNumber: 'PO2025000002',
          poDate: new Date(),
          status: 'confirmed',
          totalAmount: 5000,
          supplierId: {
            _id: mockSupplierId,
            name: 'Test Supplier',
            code: 'SUP001',
          },
          items: [
            {
              itemId: {
                _id: mockItemId,
                name: 'Test Item',
                code: 'ITEM001',
                unit: 'pcs',
              },
              boxQty: 5,
              unitQty: 0,
              receivedQuantity: 0,
              pendingQuantity: 50,
              unitTP: 100,
              netAmount: 5000,
            },
          ],
        },
      ];

      PurchaseOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPOs),
      });

      const result = await purchaseOrderService.getOutstandingPOs();

      expect(result.summary.totalPOs).toBe(2);
      expect(result.summary.totalPendingAmount).toBe(15000);
    });
  });

  describe('deletePurchaseOrder', () => {
    it('should soft delete draft purchase order', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'draft',
        isDeleted: false,
        save: jest.fn().mockResolvedValue(true),
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      const result = await purchaseOrderService.deletePurchaseOrder(mockPOId);

      expect(mockPO.isDeleted).toBe(true);
      expect(mockPO.save).toHaveBeenCalled();
      expect(result.message).toBe('Purchase order deleted successfully');
    });

    it('should throw error when deleting approved PO', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'approved',
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      await expect(
        purchaseOrderService.deletePurchaseOrder(mockPOId),
      ).rejects.toThrow('Cannot delete approved purchase order');
    });

    it('should throw error when PO not found', async () => {
      PurchaseOrder.findOne.mockResolvedValue(null);

      await expect(
        purchaseOrderService.deletePurchaseOrder(mockPOId),
      ).rejects.toThrow('Purchase order not found');
    });
  });

  describe('cancelPurchaseOrder', () => {
    it('should cancel purchase order with reason', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'sent',
        save: jest.fn().mockResolvedValue(true),
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      jest.spyOn(purchaseOrderService, 'getPurchaseOrderById').mockResolvedValue({
        ...mockPO,
        status: 'cancelled',
      });

      const result = await purchaseOrderService.cancelPurchaseOrder(
        mockPOId,
        mockUserId,
        'Supplier unavailable',
      );

      expect(mockPO.status).toBe('cancelled');
      expect(mockPO.cancelledAt).toBeDefined();
      expect(mockPO.cancelledBy).toBe(mockUserId);
      expect(mockPO.cancellationReason).toBe('Supplier unavailable');
      expect(mockPO.save).toHaveBeenCalled();
    });

    it('should throw error when PO already cancelled', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'cancelled',
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      await expect(
        purchaseOrderService.cancelPurchaseOrder(mockPOId, mockUserId, 'Test reason'),
      ).rejects.toThrow('Purchase order is already cancelled');
    });

    it('should throw error when PO already converted to invoice', async () => {
      const mockPO = {
        _id: mockPOId,
        status: 'received',
        convertedInvoiceId: new mongoose.Types.ObjectId(),
      };

      PurchaseOrder.findOne.mockResolvedValue(mockPO);

      await expect(
        purchaseOrderService.cancelPurchaseOrder(mockPOId, mockUserId, 'Test reason'),
      ).rejects.toThrow('Cannot cancel purchase order that has been converted to invoice');
    });
  });
});
