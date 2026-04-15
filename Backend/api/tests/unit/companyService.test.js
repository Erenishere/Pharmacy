/**
 * Company Service Unit Tests
 * Tests for Requirements 2.1-2.10
 * 
 * Test Coverage:
 * - Company CRUD operations
 * - Deletion prevention when items exist
 * - Group type filtering
 * - Validation logic
 */

const mongoose = require('mongoose');
const companyService = require('../../src/services/companyService');
const Company = require('../../src/models/Company');
const Item = require('../../src/models/Item');

describe('Company Service Unit Tests - Requirements 2.1-2.10', () => {
  let testUserId;

  beforeAll(async () => {
    // Create test user ID
    testUserId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await Company.deleteMany({});
    await Item.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test
    await Company.deleteMany({});
    await Item.deleteMany({});
  });

  // Helper function to create valid company data
  const createValidCompanyData = (overrides = {}) => ({
    name: 'Test Pharmaceutical Company',
    groupType: 'A',
    contactPerson: 'John Doe',
    phone: '1234567890',
    email: 'test@company.com',
    address: '123 Test Street',
    ...overrides
  });

  describe('generateCompanyCode', () => {
    it('should generate unique company code', async () => {
      const code1 = await companyService.generateCompanyCode();
      expect(code1).toMatch(/^COMP\d{6}$/);

      const code2 = await companyService.generateCompanyCode();
      expect(code2).toMatch(/^COMP\d{6}$/);
    });
  });

  describe('createCompany - Requirement 2.1-2.7', () => {
    it('should create company with valid data', async () => {
      const companyData = createValidCompanyData();
      
      const result = await companyService.createCompany(companyData, testUserId);

      expect(result).toBeDefined();
      expect(result.name).toBe(companyData.name);
      expect(result.code).toMatch(/^COMP\d{6}$/);
      expect(result.groupType).toBe('A');
      expect(result.isActive).toBe(true);
      expect(result.createdBy.toString()).toBe(testUserId.toString());
    });

    it('should create company with auto-generated code', async () => {
      const companyData = createValidCompanyData();
      delete companyData.code;

      const result = await companyService.createCompany(companyData, testUserId);

      expect(result.code).toMatch(/^COMP\d{6}$/);
    });

    it('should default status to Active - Requirement 2.5', async () => {
      const companyData = createValidCompanyData();
      delete companyData.isActive;

      const result = await companyService.createCompany(companyData, testUserId);

      expect(result.isActive).toBe(true);
    });

    it('should record creation metadata - Requirement 2.6', async () => {
      const companyData = createValidCompanyData();

      const result = await companyService.createCompany(companyData, testUserId);

      expect(result.createdBy).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });

    it('should throw error when name is missing - Requirement 2.1', async () => {
      const companyData = createValidCompanyData();
      delete companyData.name;

      try {
        await companyService.createCompany(companyData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.field === 'name')).toBe(true);
      }
    });

    it('should throw error when name is too short', async () => {
      const companyData = createValidCompanyData({ name: 'A' });

      try {
        await companyService.createCompany(companyData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.message.includes('at least 2 characters'))).toBe(true);
      }
    });

    it('should throw error when name already exists - Requirement 2.1', async () => {
      const companyData1 = createValidCompanyData({ name: 'Unique Company' });
      await companyService.createCompany(companyData1, testUserId);

      const companyData2 = createValidCompanyData({ name: 'Unique Company' });

      await expect(companyService.createCompany(companyData2, testUserId))
        .rejects.toThrow('Company name already exists');
    });

    it('should throw error when name already exists (case insensitive)', async () => {
      const companyData1 = createValidCompanyData({ name: 'Unique Company' });
      await companyService.createCompany(companyData1, testUserId);

      const companyData2 = createValidCompanyData({ name: 'unique company' });

      await expect(companyService.createCompany(companyData2, testUserId))
        .rejects.toThrow('Company name already exists');
    });

    it('should validate group type - Requirement 2.2', async () => {
      const companyData = createValidCompanyData({ groupType: 'D' });

      try {
        await companyService.createCompany(companyData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.field === 'groupType')).toBe(true);
      }
    });

    it('should accept valid group types A, B, C - Requirement 2.2', async () => {
      for (const group of ['A', 'B', 'C']) {
        const companyData = createValidCompanyData({ 
          groupType: group,
          name: `Test Company ${group}`
        });
        const result = await companyService.createCompany(companyData, testUserId);
        expect(result.groupType).toBe(group);
      }
    });

    it('should throw error when code already exists', async () => {
      const companyData1 = createValidCompanyData({ code: 'CUSTOM001' });
      await companyService.createCompany(companyData1, testUserId);

      const companyData2 = createValidCompanyData({ 
        name: 'Another Company',
        code: 'CUSTOM001' 
      });

      await expect(companyService.createCompany(companyData2, testUserId))
        .rejects.toThrow('Company code already exists');
    });

    it('should create company with optional fields', async () => {
      const companyData = createValidCompanyData({
        contactPerson: 'Jane Smith',
        phone: '9876543210',
        email: 'jane@company.com',
        address: '456 Another Street'
      });

      const result = await companyService.createCompany(companyData, testUserId);

      expect(result.contactPerson).toBe('Jane Smith');
      expect(result.phone).toBe('9876543210');
      expect(result.email).toBe('jane@company.com');
      expect(result.address).toBe('456 Another Street');
    });
  });

  describe('getCompanies - Requirement 2.7-2.8', () => {
    beforeEach(async () => {
      // Create multiple test companies
      await companyService.createCompany(createValidCompanyData({
        name: 'Company A',
        groupType: 'A'
      }), testUserId);

      await companyService.createCompany(createValidCompanyData({
        name: 'Company B',
        groupType: 'B'
      }), testUserId);

      await companyService.createCompany(createValidCompanyData({
        name: 'Company C',
        groupType: 'C'
      }), testUserId);
    });

    it('should return all companies with pagination', async () => {
      const result = await companyService.getCompanies({}, { page: 1, limit: 10 });

      expect(result.companies).toHaveLength(3);
      expect(result.pagination.totalItems).toBe(3);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter companies by keyword search', async () => {
      const result = await companyService.getCompanies({ keyword: 'Company A' });

      expect(result.companies).toHaveLength(1);
      expect(result.companies[0].name).toContain('Company A');
    });

    it('should filter companies by group type - Requirement 2.7', async () => {
      const result = await companyService.getCompanies({ groupType: 'A' });

      expect(result.companies).toHaveLength(1);
      expect(result.companies[0].groupType).toBe('A');
    });

    it('should filter companies by active status', async () => {
      const result = await companyService.getCompanies({ isActive: true });

      expect(result.companies).toHaveLength(3);
      result.companies.forEach(company => {
        expect(company.isActive).toBe(true);
      });
    });

    it('should support pagination', async () => {
      const page1 = await companyService.getCompanies({}, { page: 1, limit: 2 });
      expect(page1.companies).toHaveLength(2);
      expect(page1.pagination.hasNextPage).toBe(true);
      expect(page1.pagination.hasPreviousPage).toBe(false);

      const page2 = await companyService.getCompanies({}, { page: 2, limit: 2 });
      expect(page2.companies).toHaveLength(1);
      expect(page2.pagination.hasNextPage).toBe(false);
      expect(page2.pagination.hasPreviousPage).toBe(true);
    });

    it('should support sorting', async () => {
      const result = await companyService.getCompanies({}, { 
        sort: { name: 1 } 
      });

      expect(result.companies[0].name).toBe('Company A');
      expect(result.companies[1].name).toBe('Company B');
      expect(result.companies[2].name).toBe('Company C');
    });
  });

  describe('getCompanyById', () => {
    let createdCompany;

    beforeEach(async () => {
      createdCompany = await companyService.createCompany(
        createValidCompanyData({ name: 'Test Company' }), 
        testUserId
      );
    });

    it('should get company by ID', async () => {
      const result = await companyService.getCompanyById(createdCompany._id);

      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(createdCompany._id.toString());
      expect(result.name).toBe('Test Company');
    });

    it('should throw error when company not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(companyService.getCompanyById(fakeId))
        .rejects.toThrow('Company not found');
    });
  });

  describe('getCompaniesByGroupType - Requirement 2.7', () => {
    beforeEach(async () => {
      await companyService.createCompany(createValidCompanyData({
        name: 'Group A Company 1',
        groupType: 'A'
      }), testUserId);

      await companyService.createCompany(createValidCompanyData({
        name: 'Group A Company 2',
        groupType: 'A'
      }), testUserId);

      await companyService.createCompany(createValidCompanyData({
        name: 'Group B Company',
        groupType: 'B'
      }), testUserId);
    });

    it('should get companies by group type A', async () => {
      const result = await companyService.getCompaniesByGroupType('A');

      expect(result).toHaveLength(2);
      result.forEach(company => {
        expect(company.groupType).toBe('A');
      });
    });

    it('should get companies by group type B', async () => {
      const result = await companyService.getCompaniesByGroupType('B');

      expect(result).toHaveLength(1);
      expect(result[0].groupType).toBe('B');
    });

    it('should throw error for invalid group type', async () => {
      await expect(companyService.getCompaniesByGroupType('D'))
        .rejects.toThrow('Invalid group type');
    });

    it('should only return active companies', async () => {
      // Create an inactive company
      const inactiveCompany = await companyService.createCompany(
        createValidCompanyData({
          name: 'Inactive Company',
          groupType: 'A',
          isActive: false
        }), 
        testUserId
      );

      const result = await companyService.getCompaniesByGroupType('A');

      expect(result).toHaveLength(2);
      const inactiveFound = result.find(c => c._id.toString() === inactiveCompany._id.toString());
      expect(inactiveFound).toBeUndefined();
    });
  });

  describe('updateCompany - Requirement 2.1-2.8', () => {
    let createdCompany;

    beforeEach(async () => {
      createdCompany = await companyService.createCompany(
        createValidCompanyData({ name: 'Original Company' }), 
        testUserId
      );
    });

    it('should update company with valid data', async () => {
      const updateData = { name: 'Updated Company Name' };

      const result = await companyService.updateCompany(
        createdCompany._id, 
        updateData, 
        testUserId
      );

      expect(result.name).toBe('Updated Company Name');
      expect(result._id.toString()).toBe(createdCompany._id.toString());
    });

    it('should update group type', async () => {
      const updateData = { groupType: 'B' };

      const result = await companyService.updateCompany(
        createdCompany._id, 
        updateData, 
        testUserId
      );

      expect(result.groupType).toBe('B');
    });

    it('should update contact information', async () => {
      const updateData = {
        contactPerson: 'New Contact',
        phone: '1111111111',
        email: 'new@company.com'
      };

      const result = await companyService.updateCompany(
        createdCompany._id, 
        updateData, 
        testUserId
      );

      expect(result.contactPerson).toBe('New Contact');
      expect(result.phone).toBe('1111111111');
      expect(result.email).toBe('new@company.com');
    });

    it('should throw error when company not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(companyService.updateCompany(fakeId, { name: 'Test' }, testUserId))
        .rejects.toThrow('Company not found');
    });

    it('should validate updated data', async () => {
      const updateData = { groupType: 'D' };

      try {
        await companyService.updateCompany(createdCompany._id, updateData, testUserId);
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.validationErrors).toBeDefined();
        expect(error.validationErrors.some(e => e.field === 'groupType')).toBe(true);
      }
    });

    it('should prevent duplicate name on update - Requirement 2.1', async () => {
      const company2 = await companyService.createCompany(
        createValidCompanyData({ name: 'Company 2' }), 
        testUserId
      );

      await expect(
        companyService.updateCompany(createdCompany._id, { name: 'Company 2' }, testUserId)
      ).rejects.toThrow('Company name already exists');
    });

    it('should prevent duplicate code on update', async () => {
      const company2 = await companyService.createCompany(
        createValidCompanyData({ name: 'Company 2', code: 'UNIQUE002' }), 
        testUserId
      );

      await expect(
        companyService.updateCompany(createdCompany._id, { code: 'UNIQUE002' }, testUserId)
      ).rejects.toThrow('Company code already exists');
    });
  });

  describe('deleteCompany - Requirement 2.9-2.10', () => {
    let createdCompany;

    beforeEach(async () => {
      createdCompany = await companyService.createCompany(
        createValidCompanyData({ name: 'Company to Delete' }), 
        testUserId
      );
    });

    it('should delete company when no items exist', async () => {
      const result = await companyService.deleteCompany(createdCompany._id, testUserId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Company deleted successfully');

      // Verify company is deleted
      await expect(companyService.getCompanyById(createdCompany._id))
        .rejects.toThrow('Company not found');
    });

    it('should throw error when company not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(companyService.deleteCompany(fakeId, testUserId))
        .rejects.toThrow('Company not found');
    });

    it('should prevent deletion when items exist - Requirement 2.10', async () => {
      // Create required dependencies for item
      const testCategory = await mongoose.connection.collection('categories').insertOne({
        name: 'Test Category',
        isActive: true
      });

      const testBusinessType = await mongoose.connection.collection('businesses').insertOne({
        name: 'Medicine',
        isActive: true
      });

      // Create an item associated with the company
      await Item.create({
        name: 'Test Item',
        code: 'ITEM001',
        companyId: createdCompany._id,
        categoryId: testCategory.insertedId,
        businessTypeId: testBusinessType.insertedId,
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 10 }
      });

      await expect(companyService.deleteCompany(createdCompany._id, testUserId))
        .rejects.toThrow('Cannot delete company');
    });

    it('should provide helpful error message when deletion prevented', async () => {
      // Create required dependencies for items
      const testCategory = await mongoose.connection.collection('categories').insertOne({
        name: 'Test Category',
        isActive: true
      });

      const testBusinessType = await mongoose.connection.collection('businesses').insertOne({
        name: 'Medicine',
        isActive: true
      });

      // Create multiple items
      await Item.create({
        name: 'Test Item 1',
        code: 'ITEM001',
        companyId: createdCompany._id,
        categoryId: testCategory.insertedId,
        businessTypeId: testBusinessType.insertedId,
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 10 }
      });

      await Item.create({
        name: 'Test Item 2',
        code: 'ITEM002',
        companyId: createdCompany._id,
        categoryId: testCategory.insertedId,
        businessTypeId: testBusinessType.insertedId,
        unit: 'piece',
        pricing: { costPrice: 100, salePrice: 150 },
        inventory: { currentStock: 10 }
      });

      try {
        await companyService.deleteCompany(createdCompany._id, testUserId);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('2 item(s)');
        expect(error.message).toContain('set status to Inactive');
      }
    });
  });

  describe('toggleCompanyStatus - Requirement 2.8-2.9', () => {
    let createdCompany;

    beforeEach(async () => {
      createdCompany = await companyService.createCompany(
        createValidCompanyData({ name: 'Status Test Company' }), 
        testUserId
      );
    });

    it('should toggle company status from active to inactive', async () => {
      expect(createdCompany.isActive).toBe(true);

      const result = await companyService.toggleCompanyStatus(
        createdCompany._id, 
        testUserId
      );

      expect(result.isActive).toBe(false);
    });

    it('should toggle company status from inactive to active', async () => {
      // First toggle to inactive
      await companyService.toggleCompanyStatus(createdCompany._id, testUserId);

      // Then toggle back to active
      const result = await companyService.toggleCompanyStatus(
        createdCompany._id, 
        testUserId
      );

      expect(result.isActive).toBe(true);
    });

    it('should throw error when company not found', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await expect(companyService.toggleCompanyStatus(fakeId, testUserId))
        .rejects.toThrow('Company not found');
    });
  });

  describe('getActiveCompanies', () => {
    beforeEach(async () => {
      await companyService.createCompany(createValidCompanyData({
        name: 'Active Company 1',
        isActive: true
      }), testUserId);

      await companyService.createCompany(createValidCompanyData({
        name: 'Active Company 2',
        isActive: true
      }), testUserId);

      await companyService.createCompany(createValidCompanyData({
        name: 'Inactive Company',
        isActive: false
      }), testUserId);
    });

    it('should return only active companies', async () => {
      const result = await companyService.getActiveCompanies();

      expect(result).toHaveLength(2);
      result.forEach(company => {
        expect(company.isActive).toBe(true);
      });
    });

    it('should sort companies by name', async () => {
      const result = await companyService.getActiveCompanies();

      expect(result[0].name).toBe('Active Company 1');
      expect(result[1].name).toBe('Active Company 2');
    });
  });
});
