const mongoose = require('mongoose');
const batchCreationService = require('../batchCreationService');
const Batch = require('../../models/Batch');

// Mock the Batch model
jest.mock('../../models/Batch');

describe('BatchCreationService', () => {
  let mockUserId;
  let mockInvoiceId;
  let mockItemId;
  let mockWarehouseId;
  let mockSupplierId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = new mongoose.Types.ObjectId();
    mockInvoiceId = new mongoose.Types.ObjectId();
    mockItemId = new mongoose.Types.ObjectId();
    mockWarehouseId = new mongoose.Types.ObjectId();
    mockSupplierId = new mongoose.Types.ObjectId();
  });

  describe('validateBatchData', () => {
    // Requirement 2.2: Batch number is required
    it('should return error when batch number is missing', () => {
      const batchData = {
        manufacturingDate: '2024-01-01',
        expiryDate: '2025-01-01',
      };

      const result = batchCreationService.validateBatchData(batchData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Batch number is required');
    });

    it('should return error when batch number is empty string', () => {
      const batchData = {
        batchNumber: '   ',
        manufacturingDate: '2024-01-01',
        expiryDate: '2025-01-01',
      };

      const result = batchCreationService.validateBatchData(batchData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Batch number is required');
    });

    // Requirement 2.3: Manufacturing date is required
    it('should return error when manufacturing date is missing', () => {
      const batchData = {
        batchNumber: 'BATCH001',
        expiryDate: '2025-01-01',
      };

      const result = batchCreationService.validateBatchData(batchData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Manufacturing date is required');
    });

    // Requirement 2.4: Expiry date is required
    it('should return error when expiry date is missing', () => {
      const batchData = {
        batchNumber: 'BATCH001',
        manufacturingDate: '2024-01-01',
      };

      const result = batchCreationService.validateBatchData(batchData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expiry date is required');
    });

    // Requirement 2.5: Expiry date must be after manufacturing date
    it('should return error when expiry date is before manufacturing date', () => {
      const batchData = {
        batchNumber: 'BATCH001',
        manufacturingDate: '2025-01-01',
        expiryDate: '2024-01-01',
      };

      const result = batchCreationService.validateBatchData(batchData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expiry date must be after manufacturing date');
    });

    it('should return error when expiry date equals manufacturing date', () => {
      const batchData = {
        batchNumber: 'BATCH001',
        manufacturingDate: '2024-01-01',
        expiryDate: '2024-01-01',
      };

      const result = batchCreationService.validateBatchData(batchData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expiry date must be after manufacturing date');
    });

    it('should return valid when all data is correct', () => {
      const batchData = {
        batchNumber: 'BATCH001',
        manufacturingDate: '2024-01-01',
        expiryDate: '2025-01-01',
      };

      const result = batchCreationService.validateBatchData(batchData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return multiple errors when multiple validations fail', () => {
      const batchData = {
        batchNumber: '',
        manufacturingDate: '2025-01-01',
        expiryDate: '2024-01-01',
      };

      const result = batchCreationService.validateBatchData(batchData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('checkDuplicateBatch', () => {
    // Requirement 2.12: Check for duplicate batch
    it('should return true when batch exists', async () => {
      Batch.countDocuments.mockResolvedValue(1);

      const result = await batchCreationService.checkDuplicateBatch(
        'BATCH001',
        mockItemId,
        mockWarehouseId,
      );

      expect(result).toBe(true);
      expect(Batch.countDocuments).toHaveBeenCalledWith({
        batchNumber: expect.any(RegExp),
        item: mockItemId,
        warehouse: mockWarehouseId,
      });
    });

    it('should return false when batch does not exist', async () => {
      Batch.countDocuments.mockResolvedValue(0);

      const result = await batchCreationService.checkDuplicateBatch(
        'BATCH001',
        mockItemId,
        mockWarehouseId,
      );

      expect(result).toBe(false);
    });

    it('should perform case-insensitive search', async () => {
      Batch.countDocuments.mockResolvedValue(1);

      await batchCreationService.checkDuplicateBatch(
        'batch001',
        mockItemId,
        mockWarehouseId,
      );

      const callArgs = Batch.countDocuments.mock.calls[0][0];
      expect(callArgs.batchNumber).toEqual(expect.any(RegExp));
      expect(callArgs.batchNumber.flags).toContain('i');
    });
  });

  describe('calculateTotalQuantity', () => {
    // Requirement 1.14: Auto-calculate total unit quantity
    it('should calculate total quantity from box and unit quantities', () => {
      const item = {
        boxPacking: 10,
        boxQty: 5,
        unitQty: 3,
      };

      const result = batchCreationService.calculateTotalQuantity(item);

      expect(result).toBe(53); // (5 * 10) + 3
    });

    it('should handle zero box quantity', () => {
      const item = {
        boxPacking: 10,
        boxQty: 0,
        unitQty: 15,
      };

      const result = batchCreationService.calculateTotalQuantity(item);

      expect(result).toBe(15);
    });

    it('should handle zero unit quantity', () => {
      const item = {
        boxPacking: 10,
        boxQty: 3,
        unitQty: 0,
      };

      const result = batchCreationService.calculateTotalQuantity(item);

      expect(result).toBe(30);
    });

    it('should handle alternative property names (boxQuantity)', () => {
      const item = {
        boxPacking: 10,
        boxQuantity: 5,
        unitQuantity: 3,
      };

      const result = batchCreationService.calculateTotalQuantity(item);

      expect(result).toBe(53);
    });

    it('should default to 1 for missing box packing', () => {
      const item = {
        boxQty: 5,
        unitQty: 3,
      };

      const result = batchCreationService.calculateTotalQuantity(item);

      expect(result).toBe(8); // (5 * 1) + 3
    });
  });

  describe('calculateUnitCost', () => {
    it('should calculate unit cost from box rate', () => {
      const item = {
        boxPacking: 10,
        boxTP: 100,
        unitTP: 0,
      };

      const result = batchCreationService.calculateUnitCost(item);

      expect(result).toBe(100); // (10 * 100) / 10
    });

    it('should return unit TP when box rate is zero', () => {
      const item = {
        boxPacking: 10,
        boxTP: 0,
        unitTP: 15,
      };

      const result = batchCreationService.calculateUnitCost(item);

      expect(result).toBe(15);
    });

    it('should handle alternative property names (boxRate)', () => {
      const item = {
        boxPacking: 10,
        boxRate: 100,
        unitRate: 0,
      };

      const result = batchCreationService.calculateUnitCost(item);

      expect(result).toBe(100);
    });

    it('should default to 1 for missing box packing', () => {
      const item = {
        boxTP: 50,
        unitTP: 0,
      };

      const result = batchCreationService.calculateUnitCost(item);

      expect(result).toBe(50);
    });
  });

  describe('createNewBatch', () => {
    // Requirement 2.2-2.10: Batch creation with all required fields
    it('should create a new batch with all required fields', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockBatch = {
        save: mockSave,
      };
      Batch.mockImplementation(() => mockBatch);

      const batchData = {
        itemId: mockItemId,
        batchNumber: 'batch001',
        manufacturingDate: '2024-01-01',
        expiryDate: '2025-01-01',
        quantity: 100,
        unitCost: 10,
        warehouseId: mockWarehouseId,
        supplierId: mockSupplierId,
        invoiceId: mockInvoiceId,
        userId: mockUserId,
      };

      const result = await batchCreationService.createNewBatch(batchData);

      expect(Batch).toHaveBeenCalledWith({
        batchNumber: 'BATCH001', // Requirement 2.2: Uppercase
        item: mockItemId, // Requirement 2.6: Link to item
        warehouse: mockWarehouseId, // Requirement 2.6: Link to warehouse
        supplier: mockSupplierId, // Requirement 2.6: Link to supplier
        manufacturingDate: expect.any(Date), // Requirement 2.3
        expiryDate: expect.any(Date), // Requirement 2.4
        quantity: 100, // Requirement 2.7: Initial quantity
        remainingQuantity: 100, // Requirement 2.8: Remaining quantity equals initial
        unitCost: 10, // Requirement 2.9: Unit cost from purchase price
        totalCost: 1000,
        status: 'active', // Requirement 2.10: Status set to Active
        referenceNumber: mockInvoiceId.toString(),
        referenceType: 'PURCHASE_ORDER',
        createdBy: mockUserId,
      });
      expect(mockSave).toHaveBeenCalled();
    });

    it('should convert batch number to uppercase', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockBatch = { save: mockSave };
      Batch.mockImplementation(() => mockBatch);

      const batchData = {
        itemId: mockItemId,
        batchNumber: 'lowercase123',
        manufacturingDate: '2024-01-01',
        expiryDate: '2025-01-01',
        quantity: 50,
        unitCost: 5,
        warehouseId: mockWarehouseId,
        supplierId: mockSupplierId,
        invoiceId: mockInvoiceId,
        userId: mockUserId,
      };

      await batchCreationService.createNewBatch(batchData);

      const callArgs = Batch.mock.calls[0][0];
      expect(callArgs.batchNumber).toBe('LOWERCASE123');
    });
  });

  describe('addToExistingBatch', () => {
    // Requirement 2.11: Add quantity to existing batch
    it('should add quantity to existing batch and update average cost', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const existingBatch = {
        quantity: 100,
        remainingQuantity: 80,
        totalCost: 1000,
        unitCost: 10,
        referenceNumber: 'INV001',
        save: mockSave,
      };

      const result = await batchCreationService.addToExistingBatch(
        existingBatch,
        50, // quantity to add
        12, // new unit cost
        'INV002',
        mockUserId,
      );

      expect(existingBatch.quantity).toBe(150); // 100 + 50
      expect(existingBatch.remainingQuantity).toBe(130); // 80 + 50
      expect(existingBatch.totalCost).toBe(1600); // 1000 + (50 * 12)
      expect(existingBatch.unitCost).toBeCloseTo(10.67, 2); // 1600 / 150
      expect(existingBatch.updatedBy).toBe(mockUserId);
      expect(existingBatch.referenceNumber).toBe('INV001,INV002');
      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle first reference number correctly', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const existingBatch = {
        quantity: 100,
        remainingQuantity: 100,
        totalCost: 1000,
        unitCost: 10,
        referenceNumber: null,
        save: mockSave,
      };

      await batchCreationService.addToExistingBatch(
        existingBatch,
        50,
        10,
        'INV001',
        mockUserId,
      );

      expect(existingBatch.referenceNumber).toBe('INV001');
    });
  });

  describe('addToBatch', () => {
    // Requirement 2.11: Add quantity to existing batch (public method)
    it('should add quantity to batch by batch number', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockBatch = {
        quantity: 100,
        remainingQuantity: 100,
        totalCost: 1000,
        unitCost: 10,
        referenceNumber: 'INV001',
        save: mockSave,
      };

      Batch.findOne.mockResolvedValue(mockBatch);

      const result = await batchCreationService.addToBatch('BATCH001', 50, {
        itemId: mockItemId,
        warehouseId: mockWarehouseId,
        unitCost: 12,
        invoiceId: mockInvoiceId,
        userId: mockUserId,
      });

      expect(Batch.findOne).toHaveBeenCalledWith({
        batchNumber: expect.any(RegExp),
        item: mockItemId,
        warehouse: mockWarehouseId,
      });
      expect(mockBatch.quantity).toBe(150);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should throw error when batch not found', async () => {
      Batch.findOne.mockResolvedValue(null);

      await expect(
        batchCreationService.addToBatch('BATCH999', 50, {
          itemId: mockItemId,
          warehouseId: mockWarehouseId,
          unitCost: 12,
          invoiceId: mockInvoiceId,
          userId: mockUserId,
        }),
      ).rejects.toThrow('Batch BATCH999 not found');
    });
  });

  describe('createBatchesFromInvoice', () => {
    // Requirement 2.1: Create batch records when confirming purchase invoice
    it('should create batches for all items with batch info', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        supplierId: mockSupplierId,
        warehouseId: mockWarehouseId,
        items: [
          {
            itemId: mockItemId,
            batchInfo: {
              batchNumber: 'BATCH001',
              manufacturingDate: '2024-01-01',
              expiryDate: '2025-01-01',
            },
            boxPacking: 10,
            boxQty: 5,
            unitQty: 3,
            boxTP: 100,
            unitTP: 10,
            warehouseId: mockWarehouseId,
          },
          {
            itemId: new mongoose.Types.ObjectId(),
            batchInfo: {
              batchNumber: 'BATCH002',
              manufacturingDate: '2024-02-01',
              expiryDate: '2025-02-01',
            },
            boxPacking: 20,
            boxQty: 2,
            unitQty: 5,
            boxTP: 200,
            unitTP: 10,
            warehouseId: mockWarehouseId,
          },
        ],
      };

      Batch.findOne.mockResolvedValue(null); // No existing batches
      const mockSave = jest.fn().mockResolvedValue(true);
      Batch.mockImplementation(() => ({ save: mockSave }));

      const result = await batchCreationService.createBatchesFromInvoice(
        mockInvoice,
        mockUserId,
      );

      expect(result).toHaveLength(2);
      expect(Batch).toHaveBeenCalledTimes(2);
    });

    it('should skip items without batch info', async () => {
      const mockInvoice = {
        _id: mockInvoiceId,
        supplierId: mockSupplierId,
        warehouseId: mockWarehouseId,
        items: [
          {
            itemId: mockItemId,
            boxPacking: 10,
            boxQty: 5,
            unitQty: 3,
            boxTP: 100,
            unitTP: 10,
          },
        ],
      };

      const result = await batchCreationService.createBatchesFromInvoice(
        mockInvoice,
        mockUserId,
      );

      expect(result).toHaveLength(0);
      expect(Batch).not.toHaveBeenCalled();
    });

    it('should update existing batch if batch number already exists', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const existingBatch = {
        quantity: 100,
        remainingQuantity: 100,
        totalCost: 1000,
        unitCost: 10,
        referenceNumber: 'INV001',
        save: mockSave,
      };

      Batch.findOne.mockResolvedValue(existingBatch);

      const mockInvoice = {
        _id: mockInvoiceId,
        supplierId: mockSupplierId,
        warehouseId: mockWarehouseId,
        items: [
          {
            itemId: mockItemId,
            batchInfo: {
              batchNumber: 'BATCH001',
              manufacturingDate: '2024-01-01',
              expiryDate: '2025-01-01',
            },
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
            boxTP: 100,
            unitTP: 10,
            warehouseId: mockWarehouseId,
          },
        ],
      };

      const result = await batchCreationService.createBatchesFromInvoice(
        mockInvoice,
        mockUserId,
      );

      expect(result).toHaveLength(1);
      expect(existingBatch.quantity).toBe(150); // 100 + 50
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('reverseBatchesFromInvoice', () => {
    // Requirement 2.12: Batch is available for sales transactions (reverse on cancel)
    it('should reduce quantity from batches when invoice is cancelled', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const existingBatch = {
        quantity: 150,
        remainingQuantity: 130,
        status: 'active',
        save: mockSave,
      };

      Batch.findOne.mockResolvedValue(existingBatch);

      const mockInvoice = {
        items: [
          {
            itemId: mockItemId,
            batchInfo: {
              batchNumber: 'BATCH001',
            },
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
          },
        ],
      };

      const result = await batchCreationService.reverseBatchesFromInvoice(
        mockInvoice,
        mockUserId,
      );

      expect(result).toHaveLength(1);
      expect(existingBatch.quantity).toBe(100); // 150 - 50
      expect(existingBatch.remainingQuantity).toBe(80); // 130 - 50
      expect(existingBatch.updatedBy).toBe(mockUserId);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should set status to depleted when remaining quantity reaches zero', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const existingBatch = {
        quantity: 50,
        remainingQuantity: 50,
        status: 'active',
        save: mockSave,
      };

      Batch.findOne.mockResolvedValue(existingBatch);

      const mockInvoice = {
        items: [
          {
            itemId: mockItemId,
            batchInfo: {
              batchNumber: 'BATCH001',
            },
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
          },
        ],
      };

      await batchCreationService.reverseBatchesFromInvoice(mockInvoice, mockUserId);

      expect(existingBatch.status).toBe('depleted');
      expect(existingBatch.remainingQuantity).toBe(0);
    });

    it('should handle items without batch info', async () => {
      const mockInvoice = {
        items: [
          {
            itemId: mockItemId,
            boxPacking: 10,
            boxQty: 5,
            unitQty: 0,
          },
        ],
      };

      const result = await batchCreationService.reverseBatchesFromInvoice(
        mockInvoice,
        mockUserId,
      );

      expect(result).toHaveLength(0);
      expect(Batch.findOne).not.toHaveBeenCalled();
    });
  });
});
