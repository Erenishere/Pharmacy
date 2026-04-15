const ExcelJS = require('exceljs');
const importExportService = require('../importExportService');
const Item = require('../../models/Item');
const Customer = require('../../models/Customer');
const Company = require('../../models/Company');
const Category = require('../../models/category');
const Town = require('../../models/town');

// Mock models
jest.mock('../../models/Item');
jest.mock('../../models/Customer');
jest.mock('../../models/Company');
jest.mock('../../models/category');
jest.mock('../../models/town');

describe('ImportExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportItemsToExcel', () => {
    it('should export items to Excel format', async () => {
      const mockItems = [
        {
          code: 'ITEM001',
          name: 'Test Item',
          companyId: { name: 'Test Company' },
          categoryId: { name: 'Test Category' },
          pricing: { salePrice: 100, costPrice: 80 },
          inventory: { currentStock: 50 },
          unit: 'piece',
          isActive: true,
        },
      ];

      Item.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      });

      const buffer = await importExportService.exportItemsToExcel({});

      expect(buffer).toBeInstanceOf(Buffer);
      expect(Item.find).toHaveBeenCalled();
    });
  });

  describe('exportAccountsToExcel', () => {
    it('should export accounts to Excel format', async () => {
      const mockAccounts = [
        {
          code: 'CUST001',
          name: 'Test Customer',
          accountType: 'customer',
          townId: { name: 'Test Town' },
          contactInfo: { phone1: '1234567890' },
          isActive: true,
        },
      ];

      Customer.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAccounts),
      });

      const buffer = await importExportService.exportAccountsToExcel({});

      expect(buffer).toBeInstanceOf(Buffer);
      expect(Customer.find).toHaveBeenCalled();
    });
  });

  describe('generateItemsTemplate', () => {
    it('should generate Excel template for items', async () => {
      const buffer = await importExportService.generateItemsTemplate();

      expect(buffer).toBeInstanceOf(Buffer);

      // Verify template structure
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet(1);

      expect(worksheet).toBeDefined();
      expect(worksheet.name).toBe('Items Template');
      expect(worksheet.rowCount).toBeGreaterThan(0);
    });
  });

  describe('generateAccountsTemplate', () => {
    it('should generate Excel template for accounts', async () => {
      const buffer = await importExportService.generateAccountsTemplate();

      expect(buffer).toBeInstanceOf(Buffer);

      // Verify template structure
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet(1);

      expect(worksheet).toBeDefined();
      expect(worksheet.name).toBe('Accounts Template');
      expect(worksheet.rowCount).toBeGreaterThan(0);
    });
  });

  describe('importItemsFromExcel', () => {
    it('should import items from Excel file', async () => {
      // Create a mock Excel file
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Items');

      worksheet.columns = [
        { header: 'Code', key: 'code' },
        { header: 'Name', key: 'name' },
        { header: 'Description', key: 'description' },
        { header: 'Company', key: 'company' },
      ];

      worksheet.addRow({
        code: 'ITEM001',
        name: 'Test Item',
        description: 'Test Description',
        company: 'Test Company',
      });

      const buffer = await workbook.xlsx.writeBuffer();

      // Mock company lookup
      Company.findOne.mockResolvedValue({ _id: 'company123', name: 'Test Company' });
      Category.findOne.mockResolvedValue({ _id: 'category123', name: 'Test Category' });

      // Mock item save
      Item.findOne.mockResolvedValue(null);
      Item.prototype.save = jest.fn().mockResolvedValue({
        code: 'ITEM001',
        name: 'Test Item',
      });

      const mockUser = { _id: 'user123' };
      const results = await importExportService.importItemsFromExcel(buffer, mockUser);

      expect(results.total).toBeGreaterThan(0);
    });

    it('should handle import errors gracefully', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Items');

      worksheet.columns = [
        { header: 'Code', key: 'code' },
        { header: 'Name', key: 'name' },
      ];

      // Add invalid row (missing required fields)
      worksheet.addRow({
        code: '',
        name: '',
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const mockUser = { _id: 'user123' };

      const results = await importExportService.importItemsFromExcel(buffer, mockUser);

      expect(results.failed).toBeGreaterThan(0);
      expect(results.errors.length).toBeGreaterThan(0);
    });
  });

  describe('exportItemsToPDF', () => {
    it('should export items to PDF format', async () => {
      const mockItems = [
        {
          code: 'ITEM001',
          name: 'Test Item',
          companyId: { name: 'Test Company' },
          pricing: { salePrice: 100 },
          inventory: { currentStock: 50 },
          unit: 'piece',
          isActive: true,
        },
      ];

      Item.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockItems),
      });

      const buffer = await importExportService.exportItemsToPDF({});

      expect(buffer).toBeInstanceOf(Buffer);
      expect(Item.find).toHaveBeenCalled();
    });
  });

  describe('exportAccountsToPDF', () => {
    it('should export accounts to PDF format', async () => {
      const mockAccounts = [
        {
          code: 'CUST001',
          name: 'Test Customer',
          accountType: 'customer',
          townId: { name: 'Test Town' },
          contactInfo: { phone1: '1234567890' },
          currentBalance: 1000,
          isActive: true,
        },
      ];

      Customer.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockAccounts),
      });

      const buffer = await importExportService.exportAccountsToPDF({});

      expect(buffer).toBeInstanceOf(Buffer);
      expect(Customer.find).toHaveBeenCalled();
    });
  });
});
