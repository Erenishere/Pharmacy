const mongoose = require('mongoose');
const PhysicalCount = require('../../src/models/PhysicalCount');
const Item = require('../../src/models/Item');
const User = require('../../src/models/User');
const Warehouse = require('../../src/models/Warehouse');
const Company = require('../../src/models/Company');
const Business = require('../../src/models/Business');
const Category = require('../../src/models/Category');

describe('PhysicalCount Model', () => {
  let item1, item2, user, warehouse, company, business, category;

  beforeEach(async () => {
    await PhysicalCount.deleteMany({});
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

    // Create test items
    item1 = await Item.create({
      name: 'Test Item 1',
      code: 'ITEM001',
      companyId: company._id,
      businessTypeId: business._id,
      categoryId: category._id,
      unit: 'piece',
      pricing: { costPrice: 100, salePrice: 150 }
    });

    item2 = await Item.create({
      name: 'Test Item 2',
      code: 'ITEM002',
      companyId: company._id,
      businessTypeId: business._id,
      categoryId: category._id,
      unit: 'box',
      pricing: { costPrice: 200, salePrice: 300 }
    });

    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });

    warehouse = await Warehouse.create({
      name: 'Main Warehouse',
      code: 'WH001',
      location: {
        address: '123 Main St',
        city: 'Test City',
        country: 'Test Country'
      }
    });
  });

  describe('Schema Validation', () => {
    it('should create a valid physical count', async () => {
      const countData = {
        countNumber: 'PC2401001',
        countName: 'Monthly Count - January 2024',
        warehouse: warehouse._id,
        countDate: new Date(),
        createdBy: user._id,
        items: [
          {
            item: item1._id,
            systemQuantity: 100,
            physicalQuantity: 98,
            variance: -2,
            isCounted: true
          }
        ]
      };

      const count = new PhysicalCount(countData);
      const savedCount = await count.save();

      expect(savedCount.countNumber).toBe('PC2401001');
      expect(savedCount.countName).toBe('Monthly Count - January 2024');
      expect(savedCount.warehouse.toString()).toBe(warehouse._id.toString());
      expect(savedCount.items).toHaveLength(1);
      expect(savedCount.status).toBe('draft');
    });

    it('should require countNumber', async () => {
      const countData = {
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id
      };

      const count = new PhysicalCount(countData);
      await expect(count.save()).rejects.toThrow('Count number is required');
    });

    it('should require countName', async () => {
      const countData = {
        countNumber: 'PC2401001',
        warehouse: warehouse._id,
        createdBy: user._id
      };

      const count = new PhysicalCount(countData);
      await expect(count.save()).rejects.toThrow('Count name is required');
    });

    it('should require warehouse', async () => {
      const countData = {
        countNumber: 'PC2401001',
        countName: 'Test Count',
        createdBy: user._id
      };

      const count = new PhysicalCount(countData);
      await expect(count.save()).rejects.toThrow('Warehouse reference is required');
    });

    it('should require createdBy', async () => {
      const countData = {
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id
      };

      const count = new PhysicalCount(countData);
      await expect(count.save()).rejects.toThrow('Created by user is required');
    });

    it('should validate status enum', async () => {
      const countData = {
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        status: 'invalid_status'
      };

      const count = new PhysicalCount(countData);
      await expect(count.save()).rejects.toThrow();
    });

    it('should accept valid status values', async () => {
      const statuses = ['draft', 'in_progress', 'completed', 'cancelled'];
      
      for (const status of statuses) {
        const count = new PhysicalCount({
          countNumber: `PC240100${statuses.indexOf(status) + 1}`,
          countName: 'Test Count',
          warehouse: warehouse._id,
          createdBy: user._id,
          status
        });

        await count.save();
        expect(count.status).toBe(status);
      }
      
      // Test approved status separately with approval info
      const approvedCount = new PhysicalCount({
        countNumber: 'PC2401005',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        status: 'approved',
        approvalInfo: {
          approvedBy: user._id,
          approvedAt: new Date()
        }
      });
      
      await approvedCount.save();
      expect(approvedCount.status).toBe('approved');
    });

    it('should enforce unique countNumber', async () => {
      const countData = {
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id
      };

      await PhysicalCount.create(countData);
      
      const duplicateCount = new PhysicalCount(countData);
      await expect(duplicateCount.save()).rejects.toThrow();
    });
  });

  describe('Virtuals', () => {
    it('should calculate progress percentage', () => {
      const count = new PhysicalCount({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        statistics: {
          totalItems: 10,
          itemsCounted: 7
        }
      });

      expect(count.progressPercentage).toBe(70);
    });

    it('should return 0 progress when no items', () => {
      const count = new PhysicalCount({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        statistics: {
          totalItems: 0,
          itemsCounted: 0
        }
      });

      expect(count.progressPercentage).toBe(0);
    });

    it('should determine if count is complete', () => {
      const completeCount = new PhysicalCount({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        statistics: {
          totalItems: 5,
          itemsCounted: 5
        }
      });

      expect(completeCount.isComplete).toBe(true);

      const incompleteCount = new PhysicalCount({
        countNumber: 'PC2401002',
        countName: 'Test Count 2',
        warehouse: warehouse._id,
        createdBy: user._id,
        statistics: {
          totalItems: 5,
          itemsCounted: 3
        }
      });

      expect(incompleteCount.isComplete).toBe(false);
    });

    it('should determine if count has variances', () => {
      const countWithVariances = new PhysicalCount({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        statistics: {
          itemsWithVariance: 3
        }
      });

      expect(countWithVariances.hasVariances).toBe(true);

      const countWithoutVariances = new PhysicalCount({
        countNumber: 'PC2401002',
        countName: 'Test Count 2',
        warehouse: warehouse._id,
        createdBy: user._id,
        statistics: {
          itemsWithVariance: 0
        }
      });

      expect(countWithoutVariances.hasVariances).toBe(false);
    });
  });

  describe('Instance Methods - Status Management', () => {
    let count;

    beforeEach(async () => {
      count = await PhysicalCount.create({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        items: [
          {
            item: item1._id,
            systemQuantity: 100,
            physicalQuantity: 98,
            variance: -2,
            isCounted: true
          }
        ]
      });
    });

    describe('start', () => {
      it('should start a draft count', async () => {
        expect(count.status).toBe('draft');
        await count.start();
        expect(count.status).toBe('in_progress');
        expect(count.startedAt).toBeInstanceOf(Date);
      });

      it('should throw error when starting non-draft count', async () => {
        count.status = 'in_progress';
        await expect(async () => await count.start()).rejects.toThrow('Only draft counts can be started');
      });
    });

    describe('complete', () => {
      it('should complete an in-progress count when all items counted', async () => {
        count.status = 'in_progress';
        count.statistics.totalItems = 1;
        count.statistics.itemsCounted = 1;
        
        await count.complete();
        expect(count.status).toBe('completed');
        expect(count.completedAt).toBeInstanceOf(Date);
      });

      it('should throw error when completing non-in-progress count', async () => {
        count.status = 'draft';
        await expect(async () => await count.complete()).rejects.toThrow('Only in-progress counts can be completed');
      });

      it('should throw error when not all items are counted', async () => {
        count.status = 'in_progress';
        count.statistics.totalItems = 5;
        count.statistics.itemsCounted = 3;
        
        await expect(async () => await count.complete()).rejects.toThrow('Cannot complete count - not all items have been counted');
      });
    });

    describe('approve', () => {
      it('should approve a completed count', async () => {
        count.status = 'completed';
        count.statistics.totalItems = 1;
        count.statistics.itemsCounted = 1;
        
        await count.approve(user._id, 'Approved after review');
        
        expect(count.status).toBe('approved');
        expect(count.approvalInfo.approvedBy.toString()).toBe(user._id.toString());
        expect(count.approvalInfo.approvedAt).toBeInstanceOf(Date);
        expect(count.approvalInfo.approvalNotes).toBe('Approved after review');
      });

      it('should throw error when approving non-completed count', async () => {
        count.status = 'in_progress';
        await expect(count.approve(user._id)).rejects.toThrow('Only completed counts can be approved');
      });
    });

    describe('cancel', () => {
      it('should cancel a draft count', async () => {
        count.status = 'draft';
        await count.cancel();
        expect(count.status).toBe('cancelled');
      });

      it('should cancel an in-progress count', async () => {
        count.status = 'in_progress';
        await count.cancel();
        expect(count.status).toBe('cancelled');
      });

      it('should throw error when cancelling approved count', async () => {
        count.status = 'approved';
        await expect(async () => await count.cancel()).rejects.toThrow('Cannot cancel an approved or already cancelled count');
      });

      it('should throw error when cancelling already cancelled count', async () => {
        count.status = 'cancelled';
        await expect(async () => await count.cancel()).rejects.toThrow('Cannot cancel an approved or already cancelled count');
      });
    });
  });

  describe('Instance Methods - Item Management', () => {
    let count;

    beforeEach(async () => {
      count = await PhysicalCount.create({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        status: 'draft'
      });
    });

    describe('addItem', () => {
      it('should add an item to draft count', () => {
        count.addItem({
          item: item1._id,
          systemQuantity: 100
        });

        expect(count.items).toHaveLength(1);
        expect(count.items[0].item.toString()).toBe(item1._id.toString());
        expect(count.items[0].systemQuantity).toBe(100);
        expect(count.items[0].physicalQuantity).toBeNull();
        expect(count.items[0].isCounted).toBe(false);
        expect(count.statistics.totalItems).toBe(1);
      });

      it('should add item with batch number', () => {
        count.addItem({
          item: item1._id,
          batchNumber: 'BATCH001',
          systemQuantity: 50
        });

        expect(count.items[0].batchNumber).toBe('BATCH001');
      });

      it('should throw error when adding item to non-draft count', () => {
        count.status = 'in_progress';
        expect(() => count.addItem({
          item: item1._id,
          systemQuantity: 100
        })).toThrow('Can only add items to draft counts');
      });

      it('should throw error when adding duplicate item', () => {
        count.addItem({
          item: item1._id,
          batchNumber: 'BATCH001',
          systemQuantity: 100
        });

        expect(() => count.addItem({
          item: item1._id,
          batchNumber: 'BATCH001',
          systemQuantity: 50
        })).toThrow('Item with this batch number already exists in the count');
      });
    });

    describe('removeItem', () => {
      beforeEach(() => {
        count.addItem({
          item: item1._id,
          systemQuantity: 100
        });
        count.addItem({
          item: item2._id,
          systemQuantity: 50
        });
      });

      it('should remove an item from draft count', () => {
        const itemId = count.items[0]._id;
        count.removeItem(itemId);

        expect(count.items).toHaveLength(1);
        expect(count.statistics.totalItems).toBe(1);
      });

      it('should throw error when removing item from non-draft count', () => {
        count.status = 'in_progress';
        const itemId = count.items[0]._id;
        
        expect(() => count.removeItem(itemId)).toThrow('Can only remove items from draft counts');
      });
    });

    describe('recordCount', () => {
      beforeEach(() => {
        count.addItem({
          item: item1._id,
          systemQuantity: 100
        });
      });

      it('should record physical count for an item', () => {
        const itemId = count.items[0]._id;
        count.recordCount(itemId, 98, user._id, 'Counted carefully');

        expect(count.items[0].physicalQuantity).toBe(98);
        expect(count.items[0].variance).toBe(-2);
        expect(count.items[0].isCounted).toBe(true);
        expect(count.items[0].countedBy.toString()).toBe(user._id.toString());
        expect(count.items[0].countedAt).toBeInstanceOf(Date);
        expect(count.items[0].notes).toBe('Counted carefully');
        expect(count.statistics.itemsCounted).toBe(1);
      });

      it('should calculate positive variance', () => {
        const itemId = count.items[0]._id;
        count.recordCount(itemId, 105, user._id);

        expect(count.items[0].variance).toBe(5);
      });

      it('should calculate zero variance', () => {
        const itemId = count.items[0]._id;
        count.recordCount(itemId, 100, user._id);

        expect(count.items[0].variance).toBe(0);
      });

      it('should throw error when recording count for non-existent item', () => {
        const fakeItemId = new mongoose.Types.ObjectId();
        
        expect(() => count.recordCount(fakeItemId, 100, user._id)).toThrow('Item not found in count');
      });

      it('should throw error when recording count for completed count', () => {
        count.status = 'completed';
        const itemId = count.items[0]._id;
        
        expect(() => count.recordCount(itemId, 100, user._id)).toThrow('Can only record counts for draft or in-progress counts');
      });
    });
  });

  describe('Instance Methods - Statistics and Reports', () => {
    let count;

    beforeEach(async () => {
      count = await PhysicalCount.create({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        status: 'draft'
      });

      count.addItem({ item: item1._id, systemQuantity: 100 });
      count.addItem({ item: item2._id, systemQuantity: 50 });
    });

    describe('updateStatistics', () => {
      it('should update statistics correctly', () => {
        const item1Id = count.items[0]._id;
        count.recordCount(item1Id, 98, user._id);

        count.updateStatistics();

        expect(count.statistics.totalItems).toBe(2);
        expect(count.statistics.itemsCounted).toBe(1);
        expect(count.statistics.itemsWithVariance).toBe(1);
        expect(count.statistics.totalVarianceValue).toBe(2);
      });

      it('should count items with zero variance', () => {
        const item1Id = count.items[0]._id;
        const item2Id = count.items[1]._id;
        
        count.recordCount(item1Id, 100, user._id);
        count.recordCount(item2Id, 50, user._id);

        count.updateStatistics();

        expect(count.statistics.itemsCounted).toBe(2);
        expect(count.statistics.itemsWithVariance).toBe(0);
        expect(count.statistics.totalVarianceValue).toBe(0);
      });
    });

    describe('getVarianceReport', () => {
      it('should return items with variances', () => {
        const item1Id = count.items[0]._id;
        const item2Id = count.items[1]._id;
        
        count.recordCount(item1Id, 98, user._id, 'Found 2 damaged');
        count.recordCount(item2Id, 50, user._id);

        const report = count.getVarianceReport();

        expect(report).toHaveLength(1);
        expect(report[0].systemQuantity).toBe(100);
        expect(report[0].physicalQuantity).toBe(98);
        expect(report[0].variance).toBe(-2);
        expect(report[0].variancePercentage).toBe(-2);
        expect(report[0].notes).toBe('Found 2 damaged');
      });

      it('should calculate variance percentage correctly', () => {
        const item1Id = count.items[0]._id;
        count.recordCount(item1Id, 110, user._id);

        const report = count.getVarianceReport();

        expect(report[0].variancePercentage).toBe(10);
      });

      it('should return empty array when no variances', () => {
        const item1Id = count.items[0]._id;
        const item2Id = count.items[1]._id;
        
        count.recordCount(item1Id, 100, user._id);
        count.recordCount(item2Id, 50, user._id);

        const report = count.getVarianceReport();

        expect(report).toHaveLength(0);
      });
    });

    describe('getCountSheet', () => {
      it('should return count sheet with all items', () => {
        const sheet = count.getCountSheet();

        expect(sheet).toHaveLength(2);
        expect(sheet[0]).toHaveProperty('_id');
        expect(sheet[0]).toHaveProperty('item');
        expect(sheet[0]).toHaveProperty('systemQuantity');
        expect(sheet[0]).toHaveProperty('physicalQuantity');
        expect(sheet[0]).toHaveProperty('isCounted');
      });

      it('should include counted items in sheet', () => {
        const item1Id = count.items[0]._id;
        count.recordCount(item1Id, 98, user._id);

        const sheet = count.getCountSheet();

        expect(sheet[0].isCounted).toBe(true);
        expect(sheet[0].physicalQuantity).toBe(98);
        expect(sheet[0].variance).toBe(-2);
      });
    });

    describe('canBeEdited', () => {
      it('should return true for draft count', () => {
        count.status = 'draft';
        expect(count.canBeEdited()).toBe(true);
      });

      it('should return true for in-progress count', () => {
        count.status = 'in_progress';
        expect(count.canBeEdited()).toBe(true);
      });

      it('should return false for completed count', () => {
        count.status = 'completed';
        expect(count.canBeEdited()).toBe(false);
      });

      it('should return false for approved count', () => {
        count.status = 'approved';
        expect(count.canBeEdited()).toBe(false);
      });
    });

    describe('canBeApproved', () => {
      it('should return true for completed count with all items counted', () => {
        count.status = 'completed';
        count.statistics.totalItems = 2;
        count.statistics.itemsCounted = 2;
        
        expect(count.canBeApproved()).toBe(true);
      });

      it('should return false for non-completed count', () => {
        count.status = 'in_progress';
        count.statistics.totalItems = 2;
        count.statistics.itemsCounted = 2;
        
        expect(count.canBeApproved()).toBe(false);
      });

      it('should return false when not all items counted', () => {
        count.status = 'completed';
        count.statistics.totalItems = 2;
        count.statistics.itemsCounted = 1;
        
        expect(count.canBeApproved()).toBe(false);
      });
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await PhysicalCount.create([
        {
          countNumber: 'PC2401001',
          countName: 'January Count',
          warehouse: warehouse._id,
          countDate: yesterday,
          status: 'draft',
          createdBy: user._id
        },
        {
          countNumber: 'PC2401002',
          countName: 'February Count',
          warehouse: warehouse._id,
          countDate: new Date(),
          status: 'in_progress',
          createdBy: user._id
        },
        {
          countNumber: 'PC2401003',
          countName: 'March Count',
          warehouse: warehouse._id,
          countDate: new Date(),
          status: 'completed',
          completedAt: new Date(),
          createdBy: user._id
        },
        {
          countNumber: 'PC2401004',
          countName: 'April Count',
          warehouse: warehouse._id,
          countDate: new Date(),
          status: 'approved',
          createdBy: user._id,
          approvalInfo: {
            approvedBy: user._id,
            approvedAt: new Date()
          }
        }
      ]);
    });

    describe('generateCountNumber', () => {
      it('should generate count number with correct format', async () => {
        const countNumber = await PhysicalCount.generateCountNumber();
        
        expect(countNumber).toMatch(/^PC\d{6}$/);
        expect(countNumber.startsWith('PC')).toBe(true);
      });

      it('should increment sequence number', async () => {
        const firstNumber = await PhysicalCount.generateCountNumber();
        
        await PhysicalCount.create({
          countNumber: firstNumber,
          countName: 'Test Count',
          warehouse: warehouse._id,
          createdBy: user._id
        });

        const secondNumber = await PhysicalCount.generateCountNumber();
        
        const firstSeq = parseInt(firstNumber.slice(-4));
        const secondSeq = parseInt(secondNumber.slice(-4));
        
        expect(secondSeq).toBe(firstSeq + 1);
      });
    });

    describe('findByWarehouse', () => {
      it('should find counts by warehouse', async () => {
        const counts = await PhysicalCount.findByWarehouse(warehouse._id);
        
        expect(counts).toHaveLength(4);
        expect(counts[0].warehouse).toBeDefined();
      });

      it('should filter by status', async () => {
        const counts = await PhysicalCount.findByWarehouse(warehouse._id, { status: 'completed' });
        
        expect(counts).toHaveLength(1);
        expect(counts[0].status).toBe('completed');
      });

      it('should filter by date range', async () => {
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        const counts = await PhysicalCount.findByWarehouse(warehouse._id, {
          startDate: today,
          endDate: today
        });
        
        expect(counts.length).toBeGreaterThan(0);
      });

      it('should support pagination', async () => {
        const counts = await PhysicalCount.findByWarehouse(warehouse._id, {
          limit: 2,
          page: 1
        });
        
        expect(counts.length).toBeLessThanOrEqual(2);
      });
    });

    describe('findByStatus', () => {
      it('should find counts by status', async () => {
        const draftCounts = await PhysicalCount.findByStatus('draft');
        expect(draftCounts).toHaveLength(1);
        expect(draftCounts[0].status).toBe('draft');

        const inProgressCounts = await PhysicalCount.findByStatus('in_progress');
        expect(inProgressCounts).toHaveLength(1);
        expect(inProgressCounts[0].status).toBe('in_progress');

        const completedCounts = await PhysicalCount.findByStatus('completed');
        expect(completedCounts).toHaveLength(1);
        expect(completedCounts[0].status).toBe('completed');

        const approvedCounts = await PhysicalCount.findByStatus('approved');
        expect(approvedCounts).toHaveLength(1);
        expect(approvedCounts[0].status).toBe('approved');
      });

      it('should populate related fields', async () => {
        const counts = await PhysicalCount.findByStatus('draft');
        
        expect(counts[0].warehouse).toBeDefined();
        expect(counts[0].warehouse.name).toBe('Main Warehouse');
        expect(counts[0].createdBy).toBeDefined();
      });
    });

    describe('findPendingApprovals', () => {
      it('should find only completed counts', async () => {
        const pendingApprovals = await PhysicalCount.findPendingApprovals();
        
        expect(pendingApprovals).toHaveLength(1);
        expect(pendingApprovals[0].status).toBe('completed');
      });

      it('should sort by completedAt descending', async () => {
        const count1 = await PhysicalCount.create({
          countNumber: 'PC2401010',
          countName: 'Count 10',
          warehouse: warehouse._id,
          status: 'completed',
          completedAt: new Date(Date.now() - 60 * 60 * 1000),
          createdBy: user._id
        });

        const count2 = await PhysicalCount.create({
          countNumber: 'PC2401011',
          countName: 'Count 11',
          warehouse: warehouse._id,
          status: 'completed',
          completedAt: new Date(),
          createdBy: user._id
        });

        const pendingApprovals = await PhysicalCount.findPendingApprovals();
        
        expect(pendingApprovals[0].countNumber).toBe('PC2401011');
      });
    });

    describe('getItemCountHistory', () => {
      beforeEach(async () => {
        const count1 = await PhysicalCount.create({
          countNumber: 'PC2401010',
          countName: 'Historical Count 1',
          warehouse: warehouse._id,
          countDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          status: 'approved',
          createdBy: user._id,
          approvalInfo: {
            approvedBy: user._id,
            approvedAt: new Date()
          },
          items: [
            {
              item: item1._id,
              systemQuantity: 100,
              physicalQuantity: 98,
              variance: -2,
              isCounted: true
            }
          ]
        });

        const count2 = await PhysicalCount.create({
          countNumber: 'PC2401011',
          countName: 'Historical Count 2',
          warehouse: warehouse._id,
          countDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          status: 'completed',
          createdBy: user._id,
          items: [
            {
              item: item1._id,
              systemQuantity: 98,
              physicalQuantity: 95,
              variance: -3,
              isCounted: true
            }
          ]
        });
      });

      it('should get count history for an item', async () => {
        const history = await PhysicalCount.getItemCountHistory(item1._id);
        
        expect(history).toHaveLength(2);
        expect(history[0].systemQuantity).toBeDefined();
        expect(history[0].physicalQuantity).toBeDefined();
        expect(history[0].variance).toBeDefined();
      });

      it('should filter by warehouse', async () => {
        const history = await PhysicalCount.getItemCountHistory(item1._id, {
          warehouseId: warehouse._id
        });
        
        expect(history.length).toBeGreaterThan(0);
      });

      it('should limit results', async () => {
        const history = await PhysicalCount.getItemCountHistory(item1._id, {
          limit: 1
        });
        
        expect(history).toHaveLength(1);
      });
    });
  });

  describe('Pre-save Hooks', () => {
    it('should update statistics when items are modified', async () => {
      const count = await PhysicalCount.create({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        items: [
          {
            item: item1._id,
            systemQuantity: 100,
            physicalQuantity: 98,
            variance: -2,
            isCounted: true
          },
          {
            item: item2._id,
            systemQuantity: 50,
            physicalQuantity: 50,
            variance: 0,
            isCounted: true
          }
        ]
      });

      expect(count.statistics.totalItems).toBe(2);
      expect(count.statistics.itemsCounted).toBe(2);
      expect(count.statistics.itemsWithVariance).toBe(1);
    });

    it('should prevent completing count when not all items counted', async () => {
      const count = new PhysicalCount({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        status: 'completed',
        items: [
          {
            item: item1._id,
            systemQuantity: 100,
            isCounted: false
          }
        ]
      });

      await expect(count.save()).rejects.toThrow('Cannot complete count - not all items have been counted');
    });
  });

  describe('Pre-save Validation', () => {
    it('should prevent count date in the future', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const count = new PhysicalCount({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        countDate: futureDate,
        createdBy: user._id
      });

      await expect(count.save()).rejects.toThrow('Count date cannot be in the future');
    });

    it('should require approval info for approved counts', async () => {
      const count = new PhysicalCount({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        status: 'approved'
      });

      await expect(count.save()).rejects.toThrow('Approved counts must have approval information');
    });

    it('should allow approved count with approval info', async () => {
      const count = new PhysicalCount({
        countNumber: 'PC2401001',
        countName: 'Test Count',
        warehouse: warehouse._id,
        createdBy: user._id,
        status: 'approved',
        approvalInfo: {
          approvedBy: user._id,
          approvedAt: new Date(),
          approvalNotes: 'Approved'
        }
      });

      await expect(count.save()).resolves.toBeDefined();
    });
  });

  describe('Integration - Complete Workflow', () => {
    it('should complete full count workflow', async () => {
      // 1. Create draft count
      const count = await PhysicalCount.create({
        countNumber: 'PC2401001',
        countName: 'Monthly Count - January',
        warehouse: warehouse._id,
        createdBy: user._id
      });

      expect(count.status).toBe('draft');

      // 2. Add items
      count.addItem({ item: item1._id, systemQuantity: 100 });
      count.addItem({ item: item2._id, systemQuantity: 50 });
      await count.save();

      expect(count.items).toHaveLength(2);
      expect(count.statistics.totalItems).toBe(2);

      // 3. Start count
      await count.start();
      expect(count.status).toBe('in_progress');

      // 4. Record counts
      const item1Id = count.items[0]._id;
      const item2Id = count.items[1]._id;
      
      count.recordCount(item1Id, 98, user._id, 'Found 2 damaged');
      count.recordCount(item2Id, 52, user._id, 'Found 2 extra');
      await count.save();

      expect(count.statistics.itemsCounted).toBe(2);
      expect(count.statistics.itemsWithVariance).toBe(2);

      // 5. Complete count
      await count.complete();
      expect(count.status).toBe('completed');
      expect(count.completedAt).toBeInstanceOf(Date);

      // 6. Get variance report
      const report = count.getVarianceReport();
      expect(report).toHaveLength(2);

      // 7. Approve count
      await count.approve(user._id, 'Variances reviewed and approved');
      expect(count.status).toBe('approved');
      expect(count.approvalInfo.approvedBy.toString()).toBe(user._id.toString());
    });

    it('should handle count cancellation', async () => {
      const count = await PhysicalCount.create({
        countNumber: 'PC2401002',
        countName: 'Cancelled Count',
        warehouse: warehouse._id,
        createdBy: user._id
      });

      count.addItem({ item: item1._id, systemQuantity: 100 });
      await count.save();

      await count.start();
      expect(count.status).toBe('in_progress');

      await count.cancel();
      expect(count.status).toBe('cancelled');
    });
  });
});
