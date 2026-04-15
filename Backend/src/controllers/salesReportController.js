const ExcelJS = require('exceljs');
const salesReportService = require('../services/salesReportService');

exports.getSalesSummary = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      customerId: req.query.customerId,
      salesmanId: req.query.salesmanId,
      routeId: req.query.routeId,
    };
    const summary = await salesReportService.getSalesSummary(filters);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSalesByCustomer = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      salesmanId: req.query.salesmanId,
      routeId: req.query.routeId,
      limit: parseInt(req.query.limit) || 50,
    };
    const result = await salesReportService.getSalesByCustomer(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSalesByItem = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      categoryId: req.query.categoryId,
      limit: parseInt(req.query.limit) || 50,
    };
    const result = await salesReportService.getSalesByItem(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSalesBySalesman = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const result = await salesReportService.getSalesBySalesman(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSalesByRoute = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const result = await salesReportService.getSalesByRoute(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSalesByCategory = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const result = await salesReportService.getSalesByCategory(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getGSTSummary = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const summary = await salesReportService.getGSTSummary(filters);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getSchemeAnalysis = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      customerId: req.query.customerId,
    };
    const analysis = await salesReportService.getSchemeAnalysis(filters);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDailySalesTrend = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const result = await salesReportService.getDailySalesTrend(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getProfitAnalysis = async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };
    const analysis = await salesReportService.getProfitAnalysis(filters);
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Export sales report to Excel or PDF
 * Requirements: 7.13
 */
exports.exportReport = async (req, res) => {
  try {
    const { reportType, format = 'excel', ...filters } = req.body;

    if (!reportType) {
      return res.status(400).json({
        success: false,
        error: 'Report type is required',
      });
    }

    // Get report data based on type
    let reportData;
    let reportTitle;

    switch (reportType) {
      case 'summary':
        reportData = await salesReportService.getSalesSummary(filters);
        reportTitle = 'Sales Summary Report';
        break;
      case 'by-customer':
        reportData = await salesReportService.getSalesByCustomer(filters);
        reportTitle = 'Sales by Customer Report';
        break;
      case 'by-item':
        reportData = await salesReportService.getSalesByItem(filters);
        reportTitle = 'Sales by Item Report';
        break;
      case 'by-salesman':
        reportData = await salesReportService.getSalesBySalesman(filters);
        reportTitle = 'Sales by Salesman Report';
        break;
      case 'by-route':
        reportData = await salesReportService.getSalesByRoute(filters);
        reportTitle = 'Sales by Route Report';
        break;
      case 'by-category':
        reportData = await salesReportService.getSalesByCategory(filters);
        reportTitle = 'Sales by Category Report';
        break;
      case 'gst-summary':
        reportData = await salesReportService.getGSTSummary(filters);
        reportTitle = 'GST Summary Report';
        break;
      case 'scheme-analysis':
        reportData = await salesReportService.getSchemeAnalysis(filters);
        reportTitle = 'Scheme Analysis Report';
        break;
      case 'profit-analysis':
        reportData = await salesReportService.getProfitAnalysis(filters);
        reportTitle = 'Profit Analysis Report';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid report type',
        });
    }

    if (format === 'excel') {
      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportTitle);

      // Add title
      worksheet.addRow([reportTitle]);
      worksheet.addRow([]);

      // Add date range if provided
      if (filters.startDate || filters.endDate) {
        const dateRange = `Period: ${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`;
        worksheet.addRow([dateRange]);
        worksheet.addRow([]);
      }

      // Add data based on report type
      if (reportType === 'summary') {
        worksheet.addRow(['Metric', 'Value']);
        worksheet.addRow(['Total Invoices', reportData.totalInvoices]);
        worksheet.addRow(['Total Sales', reportData.totalSales]);
        worksheet.addRow(['Total Discount', reportData.totalDiscount]);
        worksheet.addRow(['Total GST', reportData.totalGST]);
        worksheet.addRow(['GST 18%', reportData.gst18Total]);
        worksheet.addRow(['GST 4%', reportData.gst4Total]);
        worksheet.addRow(['Advance Tax', reportData.advanceTaxTotal]);
        worksheet.addRow(['Non-Filer GST', reportData.nonFilerGSTTotal]);
        worksheet.addRow(['Paid Amount', reportData.paidAmount]);
        worksheet.addRow(['Due Amount', reportData.dueAmount]);
        worksheet.addRow(['Average Invoice Value', reportData.averageInvoiceValue]);
      } else if (reportType === 'by-customer') {
        worksheet.addRow(['Customer Name', 'Customer Code', 'Town', 'Invoices', 'Total Sales', 'Discount', 'GST', 'Paid', 'Due']);
        reportData.customers.forEach((customer) => {
          worksheet.addRow([
            customer.customerName,
            customer.customerCode,
            customer.customerTown,
            customer.invoiceCount,
            customer.totalSales,
            customer.totalDiscount,
            customer.totalGST,
            customer.paidAmount,
            customer.dueAmount,
          ]);
        });
      } else if (reportType === 'by-item') {
        worksheet.addRow(['Item Name', 'Item Code', 'Quantity', 'Boxes', 'Units', 'Scheme 1', 'Scheme 2', 'Sales', 'Discount', 'GST']);
        reportData.items.forEach((item) => {
          worksheet.addRow([
            item.itemName,
            item.itemCode,
            item.totalQuantity,
            item.totalBoxes,
            item.totalUnits,
            item.scheme1Quantity,
            item.scheme2Quantity,
            item.totalSales,
            item.totalDiscount,
            item.totalGST,
          ]);
        });
      } else if (reportType === 'by-salesman') {
        worksheet.addRow(['Salesman Name', 'Code', 'Invoices', 'Customers', 'Total Sales', 'Discount', 'GST', 'Avg Invoice']);
        reportData.salesmen.forEach((salesman) => {
          worksheet.addRow([
            salesman.salesmanName,
            salesman.salesmanCode,
            salesman.invoiceCount,
            salesman.customerCount,
            salesman.totalSales,
            salesman.totalDiscount,
            salesman.totalGST,
            salesman.averageInvoiceValue,
          ]);
        });
      } else if (reportType === 'by-route') {
        worksheet.addRow(['Route Name', 'Code', 'Invoices', 'Customers', 'Total Sales', 'Discount', 'GST']);
        reportData.routes.forEach((route) => {
          worksheet.addRow([
            route.routeName,
            route.routeCode,
            route.invoiceCount,
            route.customerCount,
            route.totalSales,
            route.totalDiscount,
            route.totalGST,
          ]);
        });
      } else if (reportType === 'by-category') {
        worksheet.addRow(['Category Name', 'Items', 'Quantity', 'Boxes', 'Units', 'Sales', 'Discount', 'GST']);
        reportData.categories.forEach((category) => {
          worksheet.addRow([
            category.categoryName,
            category.itemCount,
            category.totalQuantity,
            category.totalBoxes,
            category.totalUnits,
            category.totalSales,
            category.totalDiscount,
            category.totalGST,
          ]);
        });
      } else if (reportType === 'gst-summary') {
        worksheet.addRow(['Metric', 'Value']);
        worksheet.addRow(['GST 18% Total', reportData.gst18Total]);
        worksheet.addRow(['GST 4% Total', reportData.gst4Total]);
        worksheet.addRow(['Total GST', reportData.totalGST]);
        worksheet.addRow(['Advance Tax', reportData.advanceTaxTotal]);
        worksheet.addRow(['Non-Filer GST', reportData.nonFilerGSTTotal]);
        worksheet.addRow(['Taxable Amount (18%)', reportData.taxableAmount18]);
        worksheet.addRow(['Taxable Amount (4%)', reportData.taxableAmount4]);
        worksheet.addRow(['Total Taxable Amount', reportData.totalTaxableAmount]);
      } else if (reportType === 'scheme-analysis') {
        worksheet.addRow(['Metric', 'Value']);
        worksheet.addRow(['Scheme 1 Quantity', reportData.totalScheme1Quantity]);
        worksheet.addRow(['Scheme 2 Quantity', reportData.totalScheme2Quantity]);
        worksheet.addRow(['Scheme 1 Value', reportData.totalScheme1Value]);
        worksheet.addRow(['Scheme 2 Value', reportData.totalScheme2Value]);
        worksheet.addRow(['Total Scheme Value', reportData.totalSchemeValue]);
        worksheet.addRow(['Discount 1 Total', reportData.totalDiscount1]);
        worksheet.addRow(['Discount 2 Total', reportData.totalDiscount2]);
        worksheet.addRow(['Total Discount Value', reportData.totalDiscountValue]);
        worksheet.addRow(['Invoice Count', reportData.invoiceCount]);
      } else if (reportType === 'profit-analysis') {
        worksheet.addRow(['Metric', 'Value']);
        worksheet.addRow(['Total Sales', reportData.totalSales]);
        worksheet.addRow(['Total Cost', reportData.totalCost]);
        worksheet.addRow(['Gross Profit', reportData.grossProfit]);
        worksheet.addRow(['Total Discount', reportData.totalDiscount]);
        worksheet.addRow(['Profit Margin %', reportData.profitMargin]);
      }

      // Style the header row
      worksheet.getRow(1).font = { bold: true, size: 14 };

      // Set column widths
      worksheet.columns.forEach((column) => {
        column.width = 20;
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportTitle.replace(/ /g, '_')}.xlsx"`);

      res.send(buffer);
    } else if (format === 'pdf') {
      // PDF export would require a PDF library like pdfkit
      // For now, return JSON with a message
      return res.status(501).json({
        success: false,
        error: 'PDF export not yet implemented. Please use Excel format.',
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Use "excel" or "pdf"',
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
