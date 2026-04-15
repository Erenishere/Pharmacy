const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const Company = require('../models/Company');
const Category = require('../models/category');
const SubCategory = require('../models/subcategory');
const Formula = require('../models/formula');
const FormulaSize = require('../models/formulasize');
const Business = require('../models/business');
const Town = require('../models/town');
const Area = require('../models/area');
const Salesman = require('../models/salesman');

/**
 * Import/Export Service for Master Data Management
 * Handles Excel and PDF import/export for Items and Accounts
 */
class ImportExportService {
  /**
   * Import items from Excel file
   * @param {Buffer} fileBuffer - Excel file buffer
   * @param {Object} user - User performing the import
   * @returns {Promise<Object>} Import results with success/error counts
   */
  async importItemsFromExcel(fileBuffer, user) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
      successfulItems: [],
    };

    // Skip header row
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        rows.push({ row, rowNumber });
      }
    });

    results.total = rows.length;

    for (const { row, rowNumber } of rows) {
      try {
        const itemData = await this._parseItemRow(row);
        await this._validateItemData(itemData);

        // Check if item already exists by code
        let item = await Item.findOne({ code: itemData.code });

        if (item) {
          // Update existing item
          Object.assign(item, itemData);
          await item.save();
        } else {
          // Create new item
          item = new Item(itemData);
          await item.save();
        }

        results.success++;
        results.successfulItems.push({
          code: item.code,
          name: item.name,
          action: item.isNew ? 'created' : 'updated',
        });
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message,
          data: row.values,
        });
      }
    }

    return results;
  }

  /**
   * Import accounts from Excel file
   * @param {Buffer} fileBuffer - Excel file buffer
   * @param {Object} user - User performing the import
   * @returns {Promise<Object>} Import results
   */
  async importAccountsFromExcel(fileBuffer, user) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }

    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
      successfulAccounts: [],
    };

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        rows.push({ row, rowNumber });
      }
    });

    results.total = rows.length;

    for (const { row, rowNumber } of rows) {
      try {
        const accountData = await this._parseAccountRow(row);
        await this._validateAccountData(accountData);

        // Check if account already exists by code
        let account = await Customer.findOne({ code: accountData.code });

        if (account) {
          // Update existing account
          Object.assign(account, accountData);
          await account.save();
        } else {
          // Create new account
          account = new Customer(accountData);
          await account.save();
        }

        results.success++;
        results.successfulAccounts.push({
          code: account.code,
          name: account.name,
          action: account.isNew ? 'created' : 'updated',
        });
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message,
          data: row.values,
        });
      }
    }

    return results;
  }

  /**
   * Export items to Excel
   * @param {Object} filters - Query filters
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async exportItemsToExcel(filters = {}) {
    const items = await Item.find(filters)
      .populate('companyId', 'name')
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name')
      .populate('formulaId', 'name')
      .populate('formulaSizeId', 'size')
      .populate('businessTypeId', 'name')
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Items');

    // Define columns
    worksheet.columns = [
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Company', key: 'company', width: 20 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Sub-Category', key: 'subCategory', width: 20 },
      { header: 'Formula', key: 'formula', width: 20 },
      { header: 'Formula Size', key: 'formulaSize', width: 15 },
      { header: 'Business Type', key: 'businessType', width: 20 },
      { header: 'Selling Group', key: 'sellingGroup', width: 15 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 15 },
      { header: 'Cost Price', key: 'costPrice', width: 15 },
      { header: 'Sale Price', key: 'salePrice', width: 15 },
      { header: 'Retail Price', key: 'retailPrice', width: 15 },
      { header: 'Wholesale Price', key: 'wholesalePrice', width: 15 },
      { header: 'MRP', key: 'mrp', width: 15 },
      { header: 'Current Stock', key: 'currentStock', width: 15 },
      { header: 'Min Stock', key: 'minStock', width: 15 },
      { header: 'Max Stock', key: 'maxStock', width: 15 },
      { header: 'Reorder Point', key: 'reorderPoint', width: 15 },
      { header: 'GST Rate', key: 'gstRate', width: 10 },
      { header: 'HSN Code', key: 'hsnCode', width: 15 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Pack Size', key: 'packSize', width: 10 },
      { header: 'Status', key: 'status', width: 10 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    items.forEach((item) => {
      worksheet.addRow({
        code: item.code,
        name: item.name,
        company: item.companyId?.name || '',
        category: item.categoryId?.name || '',
        subCategory: item.subCategoryId?.name || '',
        formula: item.formulaId?.name || '',
        formulaSize: item.formulaSizeId?.size || '',
        businessType: item.businessTypeId?.name || '',
        sellingGroup: item.sellingGroup || '',
        unit: item.unit,
        purchasePrice: item.pricing?.purchasePrice || 0,
        costPrice: item.pricing?.costPrice || 0,
        salePrice: item.pricing?.salePrice || 0,
        retailPrice: item.pricing?.retailPrice || 0,
        wholesalePrice: item.pricing?.wholesalePrice || 0,
        mrp: item.pricing?.mrp || 0,
        currentStock: item.inventory?.currentStock || 0,
        minStock: item.inventory?.minimumStock || 0,
        maxStock: item.inventory?.maximumStock || 0,
        reorderPoint: item.inventory?.reorderPoint || 0,
        gstRate: item.tax?.gstRate || 0,
        hsnCode: item.tax?.hsnCode || '',
        barcode: item.barcode || '',
        packSize: item.packSize || 1,
        status: item.isActive ? 'Active' : 'Inactive',
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Export accounts to Excel
   * @param {Object} filters - Query filters
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async exportAccountsToExcel(filters = {}) {
    const accounts = await Customer.find(filters)
      .populate('townId', 'name')
      .populate('areaId', 'name')
      .populate('dimensionId', 'name')
      .populate('businessDetails.assignedSalesmanId', 'name')
      .lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Accounts');

    // Define columns
    worksheet.columns = [
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Account Type', key: 'accountType', width: 15 },
      { header: 'Town', key: 'town', width: 20 },
      { header: 'Area', key: 'area', width: 20 },
      { header: 'Phone 1', key: 'phone1', width: 15 },
      { header: 'Phone 2', key: 'phone2', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'NIC Number', key: 'nicNumber', width: 20 },
      { header: 'Customer Type', key: 'customerType', width: 15 },
      { header: 'Credit Days', key: 'creditDays', width: 12 },
      { header: 'Credit Limit', key: 'creditLimit', width: 15 },
      { header: 'Opening Balance', key: 'openingBalance', width: 15 },
      { header: 'Current Balance', key: 'currentBalance', width: 15 },
      { header: 'Salesman', key: 'salesman', width: 20 },
      { header: 'Status', key: 'status', width: 10 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    accounts.forEach((account) => {
      worksheet.addRow({
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        town: account.townId?.name || '',
        area: account.areaId?.name || '',
        phone1: account.contactInfo?.phone1 || '',
        phone2: account.contactInfo?.phone2 || '',
        email: account.contactInfo?.email || '',
        address: account.contactInfo?.address || '',
        nicNumber: account.contactInfo?.nicNumber || '',
        customerType: account.businessDetails?.customerType || '',
        creditDays: account.businessDetails?.creditDaysLimit || 0,
        creditLimit: account.businessDetails?.creditAmountLimit || 0,
        openingBalance: account.businessDetails?.openingBalance || 0,
        currentBalance: account.currentBalance || 0,
        salesman: account.businessDetails?.assignedSalesmanId?.name || '',
        status: account.isActive ? 'Active' : 'Inactive',
      });
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Export items to PDF
   * @param {Object} filters - Query filters
   * @returns {Promise<Buffer>} PDF file buffer
   */
  async exportItemsToPDF(filters = {}) {
    const items = await Item.find(filters)
      .populate('companyId', 'name')
      .populate('categoryId', 'name')
      .limit(100) // Limit for PDF to avoid huge files
      .lean();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(16).text('Items List', { align: 'center' });
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        // Table headers
        const tableTop = doc.y;
        const colWidths = [60, 150, 100, 80, 80, 80, 60];
        const headers = ['Code', 'Name', 'Company', 'Sale Price', 'Stock', 'Unit', 'Status'];

        doc.fontSize(9).font('Helvetica-Bold');
        let xPos = 30;
        headers.forEach((header, i) => {
          doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });

        doc.moveDown();
        doc.font('Helvetica').fontSize(8);

        // Table rows
        items.forEach((item) => {
          if (doc.y > 550) {
            doc.addPage();
          }

          xPos = 30;
          const yPos = doc.y;
          const rowData = [
            item.code || '',
            item.name || '',
            item.companyId?.name || '',
            `${item.pricing?.salePrice || 0}`,
            `${item.inventory?.currentStock || 0}`,
            item.unit || '',
            item.isActive ? 'Active' : 'Inactive',
          ];

          rowData.forEach((data, i) => {
            doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
            xPos += colWidths[i];
          });

          doc.moveDown(0.5);
        });

        // Footer
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).text(
            `Page ${i + 1} of ${pages.count}`,
            30,
            doc.page.height - 30,
            { align: 'center' },
          );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export accounts to PDF
   * @param {Object} filters - Query filters
   * @returns {Promise<Buffer>} PDF file buffer
   */
  async exportAccountsToPDF(filters = {}) {
    const accounts = await Customer.find(filters)
      .populate('townId', 'name')
      .limit(100)
      .lean();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
        const chunks = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(16).text('Accounts List', { align: 'center' });
        doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
        doc.moveDown();

        // Table headers
        const tableTop = doc.y;
        const colWidths = [60, 150, 80, 100, 80, 80, 60];
        const headers = ['Code', 'Name', 'Type', 'Town', 'Phone', 'Balance', 'Status'];

        doc.fontSize(9).font('Helvetica-Bold');
        let xPos = 30;
        headers.forEach((header, i) => {
          doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });

        doc.moveDown();
        doc.font('Helvetica').fontSize(8);

        // Table rows
        accounts.forEach((account) => {
          if (doc.y > 550) {
            doc.addPage();
          }

          xPos = 30;
          const yPos = doc.y;
          const rowData = [
            account.code || '',
            account.name || '',
            account.accountType || '',
            account.townId?.name || '',
            account.contactInfo?.phone1 || '',
            `${account.currentBalance || 0}`,
            account.isActive ? 'Active' : 'Inactive',
          ];

          rowData.forEach((data, i) => {
            doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
            xPos += colWidths[i];
          });

          doc.moveDown(0.5);
        });

        // Footer
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).text(
            `Page ${i + 1} of ${pages.count}`,
            30,
            doc.page.height - 30,
            { align: 'center' },
          );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Parse item row from Excel
   * @private
   */
  async _parseItemRow(row) {
    const { values } = row;

    // Map column indices to data (adjust based on your Excel template)
    const itemData = {
      code: values[1]?.toString().trim().toUpperCase(),
      name: values[2]?.toString().trim(),
      description: values[3]?.toString().trim() || '',
      unit: values[10]?.toString().trim().toLowerCase() || 'piece',
      sellingGroup: values[9]?.toString().trim() || null,
      packSize: parseInt(values[24]) || 1,
      barcode: values[23]?.toString().trim() || null,
      isActive: values[25]?.toString().toLowerCase() !== 'inactive',
    };

    // Lookup references
    if (values[3]) {
      const company = await Company.findOne({ name: new RegExp(`^${values[3]}$`, 'i') });
      if (company) itemData.companyId = company._id;
    }

    if (values[4]) {
      const category = await Category.findOne({ name: new RegExp(`^${values[4]}$`, 'i') });
      if (category) itemData.categoryId = category._id;
    }

    if (values[5]) {
      const subCategory = await SubCategory.findOne({ name: new RegExp(`^${values[5]}$`, 'i') });
      if (subCategory) itemData.subCategoryId = subCategory._id;
    }

    if (values[6]) {
      const formula = await Formula.findOne({ name: new RegExp(`^${values[6]}$`, 'i') });
      if (formula) itemData.formulaId = formula._id;
    }

    if (values[7]) {
      const formulaSize = await FormulaSize.findOne({ size: new RegExp(`^${values[7]}$`, 'i') });
      if (formulaSize) itemData.formulaSizeId = formulaSize._id;
    }

    if (values[8]) {
      const businessType = await Business.findOne({ name: new RegExp(`^${values[8]}$`, 'i') });
      if (businessType) itemData.businessTypeId = businessType._id;
    }

    // Pricing
    itemData.pricing = {
      purchasePrice: parseFloat(values[11]) || 0,
      costPrice: parseFloat(values[12]) || 0,
      salePrice: parseFloat(values[13]) || 0,
      retailPrice: parseFloat(values[14]) || 0,
      wholesalePrice: parseFloat(values[15]) || 0,
      mrp: parseFloat(values[16]) || 0,
    };

    // Inventory
    itemData.inventory = {
      currentStock: parseFloat(values[17]) || 0,
      minimumStock: parseFloat(values[18]) || 0,
      maximumStock: parseFloat(values[19]) || 0,
      reorderPoint: parseFloat(values[20]) || 0,
    };

    // Tax
    itemData.tax = {
      gstRate: parseFloat(values[21]) || 18,
      hsnCode: values[22]?.toString().trim() || '',
    };

    return itemData;
  }

  /**
   * Parse account row from Excel
   * @private
   */
  async _parseAccountRow(row) {
    const { values } = row;

    const accountData = {
      code: values[1]?.toString().trim().toUpperCase(),
      name: values[2]?.toString().trim(),
      accountType: values[3]?.toString().trim().toLowerCase() || 'customer',
      isActive: values[17]?.toString().toLowerCase() !== 'inactive',
    };

    // Lookup town
    if (values[4]) {
      const town = await Town.findOne({ name: new RegExp(`^${values[4]}$`, 'i') });
      if (town) accountData.townId = town._id;
    }

    // Lookup area
    if (values[5]) {
      const area = await Area.findOne({ name: new RegExp(`^${values[5]}$`, 'i') });
      if (area) accountData.areaId = area._id;
    }

    // Contact info
    accountData.contactInfo = {
      phone1: values[6]?.toString().trim() || '',
      phone2: values[7]?.toString().trim() || '',
      email: values[8]?.toString().trim() || '',
      address: values[9]?.toString().trim() || '',
      nicNumber: values[10]?.toString().trim() || '',
    };

    // Business details
    accountData.businessDetails = {
      customerType: values[11]?.toString().trim().toLowerCase() || '',
      creditDaysLimit: parseInt(values[12]) || 0,
      creditAmountLimit: parseFloat(values[13]) || 0,
      openingBalance: parseFloat(values[14]) || 0,
    };

    // Current balance
    accountData.currentBalance = parseFloat(values[15]) || 0;

    // Lookup salesman
    if (values[16]) {
      const salesman = await Salesman.findOne({ name: new RegExp(`^${values[16]}$`, 'i') });
      if (salesman) accountData.businessDetails.assignedSalesmanId = salesman._id;
    }

    return accountData;
  }

  /**
   * Validate item data
   * @private
   */
  async _validateItemData(itemData) {
    const errors = [];

    if (!itemData.code) {
      errors.push('Item code is required');
    }

    if (!itemData.name) {
      errors.push('Item name is required');
    }

    if (!itemData.companyId) {
      errors.push('Company is required');
    }

    if (!itemData.categoryId) {
      errors.push('Category is required');
    }

    if (!itemData.businessTypeId) {
      errors.push('Business type is required');
    }

    if (!itemData.pricing?.costPrice || itemData.pricing.costPrice < 0) {
      errors.push('Valid cost price is required');
    }

    if (!itemData.pricing?.salePrice || itemData.pricing.salePrice < 0) {
      errors.push('Valid sale price is required');
    }

    if (itemData.inventory?.minimumStock > itemData.inventory?.maximumStock) {
      errors.push('Minimum stock cannot be greater than maximum stock');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  /**
   * Validate account data
   * @private
   */
  async _validateAccountData(accountData) {
    const errors = [];

    if (!accountData.code) {
      errors.push('Account code is required');
    }

    if (!accountData.name) {
      errors.push('Account name is required');
    }

    if (!accountData.accountType) {
      errors.push('Account type is required');
    }

    const validAccountTypes = ['customer', 'supplier', 'employee', 'investor', 'both'];
    if (!validAccountTypes.includes(accountData.accountType)) {
      errors.push(`Account type must be one of: ${validAccountTypes.join(', ')}`);
    }

    if (accountData.contactInfo?.email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(accountData.contactInfo.email)) {
        errors.push('Invalid email format');
      }
    }

    if (accountData.businessDetails?.creditDaysLimit < 0) {
      errors.push('Credit days limit cannot be negative');
    }

    if (accountData.businessDetails?.creditAmountLimit < 0) {
      errors.push('Credit amount limit cannot be negative');
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  /**
   * Generate Excel template for items
   * @returns {Promise<Buffer>} Excel template buffer
   */
  async generateItemsTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Items Template');

    // Define columns with headers
    worksheet.columns = [
      { header: 'Code*', key: 'code', width: 15 },
      { header: 'Name*', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Company*', key: 'company', width: 20 },
      { header: 'Category*', key: 'category', width: 20 },
      { header: 'Sub-Category', key: 'subCategory', width: 20 },
      { header: 'Formula', key: 'formula', width: 20 },
      { header: 'Formula Size', key: 'formulaSize', width: 15 },
      { header: 'Business Type*', key: 'businessType', width: 20 },
      { header: 'Selling Group (A/B/C)', key: 'sellingGroup', width: 15 },
      { header: 'Unit*', key: 'unit', width: 10 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 15 },
      { header: 'Cost Price*', key: 'costPrice', width: 15 },
      { header: 'Sale Price*', key: 'salePrice', width: 15 },
      { header: 'Retail Price', key: 'retailPrice', width: 15 },
      { header: 'Wholesale Price', key: 'wholesalePrice', width: 15 },
      { header: 'MRP', key: 'mrp', width: 15 },
      { header: 'Current Stock', key: 'currentStock', width: 15 },
      { header: 'Min Stock', key: 'minStock', width: 15 },
      { header: 'Max Stock', key: 'maxStock', width: 15 },
      { header: 'Reorder Point', key: 'reorderPoint', width: 15 },
      { header: 'GST Rate (0/4/18)', key: 'gstRate', width: 15 },
      { header: 'HSN Code', key: 'hsnCode', width: 15 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Pack Size', key: 'packSize', width: 10 },
      { header: 'Status (Active/Inactive)', key: 'status', width: 15 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add sample row
    worksheet.addRow({
      code: 'ITEM000001',
      name: 'Sample Medicine',
      description: 'Sample description',
      company: 'Sample Company',
      category: 'Medicine',
      subCategory: 'Tablets',
      formula: 'Paracetamol',
      formulaSize: '500mg',
      businessType: 'Medicine',
      sellingGroup: 'A',
      unit: 'strip',
      purchasePrice: 100,
      costPrice: 120,
      salePrice: 150,
      retailPrice: 160,
      wholesalePrice: 140,
      mrp: 180,
      currentStock: 100,
      minStock: 10,
      maxStock: 500,
      reorderPoint: 20,
      gstRate: 18,
      hsnCode: '30049099',
      barcode: '1234567890123',
      packSize: 10,
      status: 'Active',
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Generate Excel template for accounts
   * @returns {Promise<Buffer>} Excel template buffer
   */
  async generateAccountsTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Accounts Template');

    // Define columns with headers
    worksheet.columns = [
      { header: 'Code*', key: 'code', width: 15 },
      { header: 'Name*', key: 'name', width: 30 },
      { header: 'Account Type*', key: 'accountType', width: 15 },
      { header: 'Town', key: 'town', width: 20 },
      { header: 'Area', key: 'area', width: 20 },
      { header: 'Phone 1', key: 'phone1', width: 15 },
      { header: 'Phone 2', key: 'phone2', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'NIC Number', key: 'nicNumber', width: 20 },
      { header: 'Customer Type', key: 'customerType', width: 15 },
      { header: 'Credit Days', key: 'creditDays', width: 12 },
      { header: 'Credit Limit', key: 'creditLimit', width: 15 },
      { header: 'Opening Balance', key: 'openingBalance', width: 15 },
      { header: 'Current Balance', key: 'currentBalance', width: 15 },
      { header: 'Salesman', key: 'salesman', width: 20 },
      { header: 'Status (Active/Inactive)', key: 'status', width: 15 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add sample row
    worksheet.addRow({
      code: 'CUST000001',
      name: 'Sample Customer',
      accountType: 'customer',
      town: 'Sukkur',
      area: 'City Area',
      phone1: '0300-1234567',
      phone2: '0301-7654321',
      email: 'customer@example.com',
      address: 'Sample Address, Street 1',
      nicNumber: '12345-1234567-1',
      customerType: 'retailer',
      creditDays: 30,
      creditLimit: 100000,
      openingBalance: 0,
      currentBalance: 0,
      salesman: 'Sample Salesman',
      status: 'Active',
    });

    return await workbook.xlsx.writeBuffer();
  }
}

module.exports = new ImportExportService();
