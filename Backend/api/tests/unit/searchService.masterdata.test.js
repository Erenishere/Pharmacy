const searchService = require('../../src/services/searchService');
const mongoose = require('mongoose');
const Item = require('../../src/models/Item');
const Customer = require('../../src/models/Customer');
const Company = require('../../src/models/Company');
const User = require('../../src/models/User');

describe('Search Service - Master Data', () => {
  let user;
  let company1, company2;
  let item1, item2, item3;
  let customer1, customer2, customer3;

  beforeEach(async () => {
    // Clean up
    await Item.deleteMany({});
    await Customer.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({});

    // Create test user
    user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });

    // Create test companies
    company1 = await Company.create({
      code: 'COMP001',
      name: 'Test Pharma A',
      groupType: 'A',
      contactPerson: 'John Doe',
      phone: '1234567890',
      email: 'contact@testpharma.com',
      isActive: true
    });

    company2 = await Company.create({
      code: 'COMP002',
      name: 'Generic Medicines B',
      groupType: 'B',
      contactPerson: 'Jane Smith',
      phone: '0987654321',
      isActive: true
    });

    // Create test items
    item1 = await Item.create({
      code: 'ITEM001',
      name: 'Paracetamol 500mg',
      companyId: company1._id,
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      unit: 'tablet',
      pricing: {
        costPrice: 10,
        salePrice: 15,
        retailPrice: 20
      },
      inventory: {
        currentStock: 100,
        minimumStock: 10
      },
      barcode: 'BAR001',
      isActive: true
    });

    item2 = await Item.create({
      code: 'ITEM002',
      name: 'Ibuprofen 400mg',
      companyId: company2._id,
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      unit: 'tablet',
      pricing: {
        costPrice: 20,
        salePrice: 30,
        retailPrice: 35
      },
      inventory: {
        currentStock: 50,
        minimumStock: 20
      },
      barcode: 'BAR002',
      isActive: true
    });

    item3 = await Item.create({
      code: 'ITEM003',
      name: 'Aspirin 100mg',
      companyId: company1._id,
      businessTypeId: new mongoose.Types.ObjectId(),
      categoryId: new mongoose.Types.ObjectId(),
      unit: 'tablet',
      pricing: {
        costPrice: 5,
        salePrice: 8,
        retailPrice: 10
      },
      inventory: {
        currentStock: 5,
        minimumStock: 10
      },
      isActive: false
    });

    // Create test customers/accounts
    customer1 = await Customer.create({
      code: 'CUST001',
      name: 'ABC Pharmacy',
      accountType: 'customer',
      type: 'retail',
      contactInfo: {
        phone: '1111111111',
        email: 'abc@pharmacy.com',
        address: '123 Main St'
      },
      businessDetails: {
        customerType: 'pharmacy',
        creditAmountLimit: 50000,
        creditDaysLimit: 30
      },
      currentBalance: 10000,
      isActive: true
    });

    customer2 = await Customer.create({
      code: 'CUST002',
      name: 'XYZ Medical Store',
      accountType: 'customer',
      type: 'wholesale',
      contactInfo: {
        phone: '2222222222',
        email: 'xyz@medical.com',
        address: '456 Market St'
      },
      businessDetails: {
        customerType: 'wholesaler',
        creditAmountLimit: 100000,
        creditDaysLimit: 45
      },
      currentBalance: 25000,
      isActive: true
    });

    customer3 = await Customer.create({
      code: 'SUPP001',
      name: 'Medical Supplies Inc',
      accountType: 'supplier',
      type: 'supplier',
      contactInfo: {
        phone: '3333333333',
        email: 'supplier@medical.com',
        address: '789 Industrial Ave'
      },
      currentBalance: -5000,
      isActive: true
    });
  });

  describe('searchItems', () => {
    it('should search items by text', async () => {
      const result = await searchService.searchItems({
        searchText: 'Paracetamol',
        page: 1,
        limit: 10,
        populate: [] // Don't populate to avoid missing schema errors
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Paracetamol 500mg');
      expect(result.pagination.total).toBe(1);
    });

    it('should search items by barcode', async () => {
      const result = await searchService.searchItems({
        searchText: 'BAR002',
        page: 1,
        limit: 10,
        populate: []
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].barcode).toBe('BAR002');
    });

    it('should filter items by company', async () => {
      const result = await searchService.searchItems({
        filters: [
          { field: 'companyId', operator: 'equals', value: company1._id.toString() }
        ],
        page: 1,
        limit: 10,
        populate: []
      });

      expect(result.results.length).toBeGreaterThanOrEqual(2);
      result.results.forEach(item => {
        expect(item.companyId.toString()).toBe(company1._id.toString());
      });
    });

    it('should filter items by price range', async () => {
      const result = await searchService.searchItems({
        filters: [
          { field: 'pricing.salePrice', operator: 'gte', value: 10 },
          { field: 'pricing.salePrice', operator: 'lte', value: 20 }
        ],
        page: 1,
        limit: 10,
        populate: []
      });

      expect(result.results.length).toBeGreaterThan(0);
      result.results.forEach(item => {
        expect(item.pricing.salePrice).toBeGreaterThanOrEqual(10);
        expect(item.pricing.salePrice).toBeLessThanOrEqual(20);
      });
    });

    it('should filter items by active status', async () => {
      const result = await searchService.searchItems({
        filters: [
          { field: 'isActive', operator: 'equals', value: true }
        ],
        page: 1,
        limit: 10,
        populate: []
      });

      expect(result.results.length).toBeGreaterThan(0);
      result.results.forEach(item => {
        expect(item.isActive).toBe(true);
      });
    });

    it('should sort items by name', async () => {
      const result = await searchService.searchItems({
        sort: [{ field: 'name', order: 'asc' }],
        page: 1,
        limit: 10,
        populate: []
      });

      expect(result.results.length).toBeGreaterThan(1);
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i].name >= result.results[i - 1].name).toBe(true);
      }
    });

    it('should apply pagination', async () => {
      const result = await searchService.searchItems({
        page: 1,
        limit: 2,
        populate: []
      });

      expect(result.results.length).toBeLessThanOrEqual(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
    });
  });

  describe('searchAccounts', () => {
    it('should search accounts by text', async () => {
      const result = await searchService.searchAccounts({
        searchText: 'ABC',
        page: 1,
        limit: 10,
        populate: []
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('ABC Pharmacy');
    });

    it('should filter accounts by type', async () => {
      const result = await searchService.searchAccounts({
        filters: [
          { field: 'accountType', operator: 'equals', value: 'customer' }
        ],
        page: 1,
        limit: 10,
        populate: []
      });

      expect(result.results.length).toBeGreaterThanOrEqual(2);
      result.results.forEach(account => {
        expect(account.accountType).toBe('customer');
      });
    });

    it('should filter accounts by credit limit range', async () => {
      const result = await searchService.searchAccounts({
        filters: [
          { field: 'businessDetails.creditAmountLimit', operator: 'gte', value: 50000 }
        ],
        page: 1,
        limit: 10,
        populate: []
      });

      expect(result.results.length).toBeGreaterThan(0);
      result.results.forEach(account => {
        if (account.businessDetails && account.businessDetails.creditAmountLimit) {
          expect(account.businessDetails.creditAmountLimit).toBeGreaterThanOrEqual(50000);
        }
      });
    });

    it('should sort accounts by name', async () => {
      const result = await searchService.searchAccounts({
        sort: [{ field: 'name', order: 'asc' }],
        page: 1,
        limit: 10,
        populate: []
      });

      expect(result.results.length).toBeGreaterThan(1);
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i].name >= result.results[i - 1].name).toBe(true);
      }
    });
  });

  describe('searchCompanies', () => {
    it('should search companies by text', async () => {
      const result = await searchService.searchCompanies({
        searchText: 'Pharma',
        page: 1,
        limit: 10
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toContain('Pharma');
    });

    it('should filter companies by group type', async () => {
      const result = await searchService.searchCompanies({
        filters: [
          { field: 'groupType', operator: 'equals', value: 'A' }
        ],
        page: 1,
        limit: 10
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].groupType).toBe('A');
    });

    it('should sort companies by name', async () => {
      const result = await searchService.searchCompanies({
        sort: [{ field: 'name', order: 'asc' }],
        page: 1,
        limit: 10
      });

      expect(result.results.length).toBeGreaterThan(1);
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i].name >= result.results[i - 1].name).toBe(true);
      }
    });
  });

  describe('Cache functionality', () => {
    it('should cache search results', async () => {
      const criteria = {
        searchText: 'Paracetamol',
        page: 1,
        limit: 10
      };

      // First call - should hit database
      const result1 = await searchService.searchWithCache('Item', Item, criteria);
      
      // Second call - should hit cache
      const result2 = await searchService.searchWithCache('Item', Item, criteria);

      expect(result1).toEqual(result2);
    });

    it('should clear cache for specific model', () => {
      searchService.setCachedResults('Item:test', { data: 'test' });
      searchService.setCachedResults('Customer:test', { data: 'test' });

      searchService.clearCache('Item');

      expect(searchService.getCachedResults('Item:test')).toBeNull();
      expect(searchService.getCachedResults('Customer:test')).not.toBeNull();
    });

    it('should clear all cache', () => {
      searchService.setCachedResults('Item:test', { data: 'test' });
      searchService.setCachedResults('Customer:test', { data: 'test' });

      searchService.clearCache();

      expect(searchService.getCachedResults('Item:test')).toBeNull();
      expect(searchService.getCachedResults('Customer:test')).toBeNull();
    });
  });
});
