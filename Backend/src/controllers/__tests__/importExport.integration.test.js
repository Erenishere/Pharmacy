const request = require('supertest');
const express = require('express');
const ExcelJS = require('exceljs');
const itemRoutes = require('../../routes/itemRoutes');
const customerRoutes = require('../../routes/customers');

// Mock authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: 'testuser123', role: 'admin' };
    next();
  },
  authorize: (roles) => (req, res, next) => next(),
  requireRoles: (roles) => (req, res, next) => next(),
}));

// Mock services
jest.mock('../../services/importExportService');
const importExportService = require('../../services/importExportService');

describe('Import/Export Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/items', itemRoutes);
    app.use('/api/customers', customerRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Items Import/Export', () => {
    it('GET /api/v1/items/template should download template', async () => {
      const mockBuffer = Buffer.from('mock excel data');
      importExportService.generateItemsTemplate.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get('/api/v1/items/template')
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(importExportService.generateItemsTemplate).toHaveBeenCalled();
    });

    it('GET /api/v1/items/export should export items to Excel', async () => {
      const mockBuffer = Buffer.from('mock excel data');
      importExportService.exportItemsToExcel.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get('/api/v1/items/export?format=excel')
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(importExportService.exportItemsToExcel).toHaveBeenCalled();
    });

    it('GET /api/v1/items/export should export items to PDF', async () => {
      const mockBuffer = Buffer.from('mock pdf data');
      importExportService.exportItemsToPDF.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get('/api/v1/items/export?format=pdf')
        .expect(200);

      expect(response.headers['content-type']).toContain('pdf');
      expect(importExportService.exportItemsToPDF).toHaveBeenCalled();
    });
  });

  describe('Accounts Import/Export', () => {
    it('GET /api/customers/template should download template', async () => {
      const mockBuffer = Buffer.from('mock excel data');
      importExportService.generateAccountsTemplate.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get('/api/customers/template')
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(importExportService.generateAccountsTemplate).toHaveBeenCalled();
    });

    it('GET /api/customers/export should export accounts to Excel', async () => {
      const mockBuffer = Buffer.from('mock excel data');
      importExportService.exportAccountsToExcel.mockResolvedValue(mockBuffer);

      const response = await request(app)
        .get('/api/customers/export?format=excel')
        .expect(200);

      expect(response.headers['content-type']).toContain('spreadsheetml');
      expect(importExportService.exportAccountsToExcel).toHaveBeenCalled();
    });
  });
});
