const mongoose = require('mongoose');
const StockMovement = require('../../src/models/StockMovement');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Warehouse = require('../../src/models/Warehouse');
const Company = require('../../src/models/Company');
const Business = require('../../src/models/Business');
const Category = require('../../src/models/Category');

describe('StockMovement Model', () => {
  let item, user, warehouse1, warehouse2, company, business, category;

  beforeEach(async () => {
    await StockMovement.deleteMany({});
    await Item.deleteMany({});
    await User.deleteMany({});
    await Warehouse.deleteMany({});
    await Company.deleteMany({});
    await Business.deleteMany({});
    await Category.deleteMany({});

    // Create required related data
    company = await Company.create({
      name: 'Test Company',
      code: 'TC001'
    });

    business = await Business.create({
      name: 'Surgical',
      code: 'TB001'
    });

    category = await Category.create({
      name: 'Test Category',
      code: 'CAT001'
    });

    // Create test data
    item = await Item.create({
      name: 'Test Item',
      code: 'ITEM001',
      companyId: company._id,
      businessTypeId: business._id,
      categoryId: category._id,
      unit: 'piece',
      pricing: { costPrice: 100, salePrice: 150 }
    });

    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });

    warehouse1 = await Warehouse.create({
      name: 'Main Warehouse',
      code: 'WH001',
      location: '123 Main St'
    });

    warehouse2 = await Warehouse.create({
      name: 'Branch Warehouse',
      code: 'WH002',
      location: '456 Branch St'
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid stock movement', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'purchase_invoice',
        referenceId: new mongoose.Types.ObjectId(),
        batchInfo: {
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          manufacturingDate: new Date()
        },
        movementDate: new Date(),
        notes: 'Initial stock',
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      const savedMovement = await movement.save();

      expect(savedMovement.itemId.toString()).toBe(item._id.toString());
      expect(savedMovement.movementType).toBe('in');
      expect(savedMovement.quantity).toBe(50);
    });

    it('should require itemId', async () => {
      const movementData = {
        movementType: 'in',
        quantity: 50,
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow('Item ID is required');
    });

    it('should validate movement type enum', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'invalid_type',
        quantity: 50,
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow();
    });

    it('should not allow zero quantity', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'in',
        quantity: 0,
        referenceType: 'adjustment',
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow('Quantity cannot be zero');
    });

    it('should require referenceId for invoice movements', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'sales_invoice',
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow();
    });
  });

  describe('Virtuals', () => {
    it('should calculate absolute quantity', () => {
      const movement = new StockMovement({
        itemId: item._id,
        movementType: 'out',
        quantity: -25,
        referenceType: 'adjustment',
        createdBy: user._id
      });

      expect(movement.absoluteQuantity).toBe(25);
    });

    it('should determine movement direction', () => {
      const inMovement = new StockMovement({
        itemId: item._id,
        movementType: 'in',
        quantity: 25,
        referenceType: 'adjustment',
        createdBy: user._id
      });
      expect(inMovement.direction).toBe('inward');

      const outMovement = new StockMovement({
        itemId: item._id,
        movementType: 'out',
        quantity: -25,
        referenceType: 'adjustment',
        createdBy: user._id
      });
      expect(outMovement.direction).toBe('outward');

      const adjustmentIn = new StockMovement({
        itemId: item._id,
        movementType: 'adjustment',
        quantity: 10,
        referenceType: 'adjustment',
        createdBy: user._id
      });
      expect(adjustmentIn.direction).toBe('inward');

      const adjustmentOut = new StockMovement({
        itemId: item._id,
        movementType: 'adjustment',
        quantity: -10,
        referenceType: 'adjustment',
        createdBy: user._id
      });
      expect(adjustmentOut.direction).toBe('outward');
    });
  });

  describe('Instance Methods', () => {
    let movement;

    beforeEach(() => {
      movement = new StockMovement({
        itemId: item._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'purchase_invoice',
        batchInfo: {
          batchNumber: 'BATCH001',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        },
        createdBy: user._id
      });
    });

    it('should get movement description', () => {
      expect(movement.getMovementDescription()).toBe('Purchase from supplier');

      movement.referenceType = 'sales_invoice';
      expect(movement.getMovementDescription()).toBe('Sale to customer');

      movement.referenceType = 'adjustment';
      expect(movement.getMovementDescription()).toBe('Stock adjustment');
    });

    it('should check if batch is expired', () => {
      expect(movement.isBatchExpired()).toBe(false);

      // Set expiry date to yesterday
      movement.batchInfo.expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(movement.isBatchExpired()).toBe(true);

      // No expiry date
      movement.batchInfo.expiryDate = null;
      expect(movement.isBatchExpired()).toBe(false);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await StockMovement.create([
        {
          itemId: item._id,
          movementType: 'in',
          quantity: 100,
          referenceType: 'opening_balance',
          movementDate: yesterday,
          createdBy: user._id
        },
        {
          itemId: item._id,
          movementType: 'out',
          quantity: -30,
          referenceType: 'sales_invoice',
          referenceId: new mongoose.Types.ObjectId(),
          movementDate: new Date(),
          createdBy: user._id
        },
        {
          itemId: item._id,
          movementType: 'in',
          quantity: 20,
          referenceType: 'purchase_invoice',
          referenceId: new mongoose.Types.ObjectId(),
          movementDate: new Date(),
          batchInfo: {
            batchNumber: 'EXPIRED001',
            expiryDate: yesterday
          },
          createdBy: user._id
        }
      ]);
    });

    it('should find movements by item', async () => {
      const movements = await StockMovement.findByItem(item._id);
      expect(movements).toHaveLength(3);
      expect(movements[0].movementDate).toBeInstanceOf(Date);
    });

    it('should find movements by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const movements = await StockMovement.findByDateRange(yesterday, tomorrow);
      expect(movements).toHaveLength(3);
    });

    it('should find movements by reference', async () => {
      const movements = await StockMovement.findByReference('opening_balance');
      expect(movements).toHaveLength(1);
    });

    it('should calculate stock balance', async () => {
      const balance = await StockMovement.calculateStockBalance(item._id);
      expect(balance).toBe(90); // 100 - 30 + 20
    });

    it('should find expired batches', async () => {
      const expiredBatches = await StockMovement.findExpiredBatches();
      expect(expiredBatches).toHaveLength(1);
      expect(expiredBatches[0].batchInfo.batchNumber).toBe('EXPIRED001');
    });

    it('should get movements summary', async () => {
      const summary = await StockMovement.getMovementsSummary(item._id, 30);
      expect(summary).toHaveLength(2); // 'in' and 'out' movements
      
      const inSummary = summary.find(s => s._id === 'in');
      expect(inSummary.totalQuantity).toBe(120); // 100 + 20
      expect(inSummary.count).toBe(2);

      const outSummary = summary.find(s => s._id === 'out');
      expect(outSummary.totalQuantity).toBe(-30);
      expect(outSummary.count).toBe(1);
    });
  });

  describe('Pre-save Validation', () => {
    it('should validate manufacturing date before expiry date', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'adjustment',
        batchInfo: {
          manufacturingDate: new Date(),
          expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        },
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow('Manufacturing date cannot be after expiry date');
    });

    it('should validate movement date is not in future', async () => {
      const movementData = {
        itemId: item._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'adjustment',
        movementDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        createdBy: user._id
      };

      const movement = new StockMovement(movementData);
      await expect(movement.save()).rejects.toThrow('Movement date cannot be in the future');
    });

    it('should adjust quantity sign based on movement type', async () => {
      const inMovement = new StockMovement({
        itemId: item._id,
        movementType: 'in',
        quantity: -50, // Negative quantity for 'in' movement
        referenceType: 'adjustment',
        createdBy: user._id
      });

      await inMovement.save();
      expect(inMovement.quantity).toBe(50); // Should be converted to positive

      const outMovement = new StockMovement({
        itemId: item._id,
        movementType: 'out',
        quantity: 30, // Positive quantity for 'out' movement
        referenceType: 'adjustment',
        createdBy: user._id
      });

      await outMovement.save();
      expect(outMovement.quantity).toBe(-30); // Should be converted to negative
    });
  });

  describe('Status Field', () => {
    it('should default to completed for non-transfer movements', async () => {
      const movement = new StockMovement({
        itemId: item._id,
        warehouse: warehouse1._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'purchase_invoice',
        referenceId: new mongoose.Types.ObjectId(),
        createdBy: user._id
      });

      await movement.save();
      expect(movement.status).toBe('completed');
    });

    it('should default to pending for transfer movements', async () => {
      const movement = new StockMovement({
        itemId: item._id,
        warehouse: warehouse1._id,
        movementType: 'out',
        quantity: 50,
        referenceType: 'warehouse_transfer',
        transferInfo: {
          toWarehouse: warehouse2._id,
          transferId: new mongoose.Types.ObjectId()
        },
        createdBy: user._id
      });

      await movement.save();
      expect(movement.status).toBe('pending');
    });

    it('should validate status enum values', async () => {
      const movement = new StockMovement({
        itemId: item._id,
        warehouse: warehouse1._id,
        movementType: 'in',
        quantity: 50,
        referenceType: 'adjustment',
        status: 'invalid_status',
        createdBy: user._id
      });

      await expect(movement.save()).rejects.toThrow();
    });

    it('should accept valid status values', async () => {
      const statuses = ['pending', 'in_transit', 'completed', 'cancelled'];
      
      for (const status of statuses) {
        const movement = new StockMovement({
          itemId: item._id,
          warehouse: warehouse1._id,
          movementType: 'in',
          quantity: 50,
          referenceType: 'adjustment',
          status,
          createdBy: user._id
        });

        await movement.save();
        expect(movement.status).toBe(status);
        await StockMovement.deleteMany({});
      }
    });
  });

  describe('Status Instance Methods', () => {
    let movement;

    beforeEach(async () => {
      movement = await StockMovement.create({
        itemId: item._id,
        warehouse: warehouse1._id,
        movementType: 'out',
        quantity: 50,
        referenceType: 'warehouse_transfer',
        transferInfo: {
          toWarehouse: warehouse2._id,
          transferId: new mongoose.Types.ObjectId()
        },
        status: 'pending',
        createdBy: user._id
      });
    });

    describe('canBeCancelled', () => {
      it('should return true for pending movements', () => {
        movement.status = 'pending';
        expect(movement.canBeCancelled()).toBe(true);
      });

      it('should return true for in_transit movements', () => {
        movement.status = 'in_transit';
        expect(movement.canBeCancelled()).toBe(true);
      });

      it('should return false for completed movements', () => {
        movement.status = 'completed';
        expect(movement.canBeCancelled()).toBe(false);
      });

      it('should return false for cancelled movements', () => {
        movement.status = 'cancelled';
        expect(movement.canBeCancelled()).toBe(false);
      });
    });

    describe('isInTransit', () => {
      it('should return true when status is in_transit', () => {
        movement.status = 'in_transit';
        expect(movement.isInTransit()).toBe(true);
      });

      it('should return false when status is not in_transit', () => {
        movement.status = 'pending';
        expect(movement.isInTransit()).toBe(false);
      });
    });

    describe('isCompleted', () => {
      it('should return true when status is completed', () => {
        movement.status = 'completed';
        expect(movement.isCompleted()).toBe(true);
      });

      it('should return false when status is not completed', () => {
        movement.status = 'pending';
        expect(movement.isCompleted()).toBe(false);
      });
    });

    describe('cancel', () => {
      it('should cancel a pending movement', async () => {
        movement.status = 'pending';
        await movement.cancel();
        expect(movement.status).toBe('cancelled');
      });

      it('should cancel an in_transit movement', async () => {
        movement.status = 'in_transit';
        await movement.cancel();
        expect(movement.status).toBe('cancelled');
      });

      it('should throw error when cancelling completed movement', async () => {
        movement.status = 'completed';
        await expect(movement.cancel()).rejects.toThrow('Cannot cancel a completed or already cancelled movement');
      });

      it('should throw error when cancelling already cancelled movement', async () => {
        movement.status = 'cancelled';
        await expect(movement.cancel()).rejects.toThrow('Cannot cancel a completed or already cancelled movement');
      });
    });

    describe('markInTransit', () => {
      it('should mark pending movement as in_transit', async () => {
        movement.status = 'pending';
        await movement.markInTransit();
        expect(movement.status).toBe('in_transit');
      });

      it('should throw error when marking non-pending movement as in_transit', async () => {
        movement.status = 'completed';
        await expect(movement.markInTransit()).rejects.toThrow('Only pending movements can be marked as in transit');
      });
    });

    describe('complete', () => {
      it('should complete a pending movement', async () => {
        movement.status = 'pending';
        await movement.complete();
        expect(movement.status).toBe('completed');
      });

      it('should complete an in_transit movement', async () => {
        movement.status = 'in_transit';
        await movement.complete();
        expect(movement.status).toBe('completed');
      });

      it('should throw error when completing cancelled movement', async () => {
        movement.status = 'cancelled';
        await expect(movement.complete()).rejects.toThrow('Only pending or in-transit movements can be completed');
      });

      it('should throw error when completing already completed movement', async () => {
        movement.status = 'completed';
        await expect(movement.complete()).rejects.toThrow('Only pending or in-transit movements can be completed');
      });
    });
  });

  describe('Status Static Methods', () => {
    beforeEach(async () => {
      // Create movements with different statuses
      await StockMovement.create([
        {
          itemId: item._id,
          warehouse: warehouse1._id,
          movementType: 'out',
          quantity: 50,
          referenceType: 'warehouse_transfer',
          transferInfo: {
            toWarehouse: warehouse2._id,
            transferId: new mongoose.Types.ObjectId()
          },
          status: 'pending',
          createdBy: user._id
        },
        {
          itemId: item._id,
          warehouse: warehouse1._id,
          movementType: 'out',
          quantity: 30,
          referenceType: 'warehouse_transfer',
          transferInfo: {
            toWarehouse: warehouse2._id,
            transferId: new mongoose.Types.ObjectId()
          },
          status: 'in_transit',
          createdBy: user._id
        },
        {
          itemId: item._id,
          warehouse: warehouse1._id,
          movementType: 'in',
          quantity: 100,
          referenceType: 'purchase_invoice',
          referenceId: new mongoose.Types.ObjectId(),
          status: 'completed',
          createdBy: user._id
        },
        {
          itemId: item._id,
          warehouse: warehouse1._id,
          movementType: 'out',
          quantity: 20,
          referenceType: 'warehouse_transfer',
          transferInfo: {
            toWarehouse: warehouse2._id,
            transferId: new mongoose.Types.ObjectId()
          },
          status: 'cancelled',
          createdBy: user._id
        }
      ]);
    });

    describe('findByStatus', () => {
      it('should find movements by pending status', async () => {
        const movements = await StockMovement.findByStatus('pending');
        expect(movements).toHaveLength(1);
        expect(movements[0].status).toBe('pending');
      });

      it('should find movements by in_transit status', async () => {
        const movements = await StockMovement.findByStatus('in_transit');
        expect(movements).toHaveLength(1);
        expect(movements[0].status).toBe('in_transit');
      });

      it('should find movements by completed status', async () => {
        const movements = await StockMovement.findByStatus('completed');
        expect(movements).toHaveLength(1);
        expect(movements[0].status).toBe('completed');
      });

      it('should find movements by cancelled status', async () => {
        const movements = await StockMovement.findByStatus('cancelled');
        expect(movements).toHaveLength(1);
        expect(movements[0].status).toBe('cancelled');
      });

      it('should populate related fields', async () => {
        const movements = await StockMovement.findByStatus('pending');
        expect(movements[0].itemId).toBeDefined();
        expect(movements[0].itemId.name).toBe('Test Item');
        expect(movements[0].warehouse).toBeDefined();
        expect(movements[0].warehouse.name).toBe('Main Warehouse');
      });
    });

    describe('findInTransitTransfers', () => {
      it('should find only in_transit transfer movements', async () => {
        const movements = await StockMovement.findInTransitTransfers();
        expect(movements).toHaveLength(1);
        expect(movements[0].status).toBe('in_transit');
        expect(movements[0].referenceType).toBe('warehouse_transfer');
      });

      it('should populate transfer warehouse information', async () => {
        const movements = await StockMovement.findInTransitTransfers();
        expect(movements[0].transferInfo.toWarehouse).toBeDefined();
        expect(movements[0].transferInfo.toWarehouse.name).toBe('Branch Warehouse');
      });
    });

    describe('findPendingMovements', () => {
      it('should find only pending movements', async () => {
        const movements = await StockMovement.findPendingMovements();
        expect(movements).toHaveLength(1);
        expect(movements[0].status).toBe('pending');
      });

      it('should populate related fields', async () => {
        const movements = await StockMovement.findPendingMovements();
        expect(movements[0].itemId).toBeDefined();
        expect(movements[0].warehouse).toBeDefined();
        expect(movements[0].createdBy).toBeDefined();
      });
    });
  });

  describe('Stock Balance Calculation with Status', () => {
    beforeEach(async () => {
      // Create movements with different statuses
      await StockMovement.create([
        {
          itemId: item._id,
          warehouse: warehouse1._id,
          movementType: 'in',
          quantity: 100,
          referenceType: 'purchase_invoice',
          referenceId: new mongoose.Types.ObjectId(),
          status: 'completed',
          createdBy: user._id
        },
        {
          itemId: item._id,
          warehouse: warehouse1._id,
          movementType: 'out',
          quantity: 30,
          referenceType: 'warehouse_transfer',
          transferInfo: {
            toWarehouse: warehouse2._id,
            transferId: new mongoose.Types.ObjectId()
          },
          status: 'in_transit', // Should not be counted
          createdBy: user._id
        },
        {
          itemId: item._id,
          warehouse: warehouse1._id,
          movementType: 'out',
          quantity: 20,
          referenceType: 'sales_invoice',
          referenceId: new mongoose.Types.ObjectId(),
          status: 'completed',
          createdBy: user._id
        },
        {
          itemId: item._id,
          warehouse: warehouse1._id,
          movementType: 'out',
          quantity: 10,
          referenceType: 'warehouse_transfer',
          transferInfo: {
            toWarehouse: warehouse2._id,
            transferId: new mongoose.Types.ObjectId()
          },
          status: 'cancelled', // Should not be counted
          createdBy: user._id
        }
      ]);
    });

    it('should only count completed movements in stock balance', async () => {
      const balance = await StockMovement.calculateStockBalance(item._id, warehouse1._id);
      // Should be: 100 (in, completed) - 20 (out, completed) = 80
      // Should NOT count: 30 (in_transit) and 10 (cancelled)
      expect(balance).toHaveLength(1);
      expect(balance[0].balance).toBe(80);
    });

    it('should only count completed movements in item stock levels', async () => {
      const stockLevels = await StockMovement.getItemStockLevels(item._id);
      // Should only count completed movements
      expect(stockLevels).toHaveLength(1);
      expect(stockLevels[0].quantity).toBe(80); // 100 - 20
    });
  });
});