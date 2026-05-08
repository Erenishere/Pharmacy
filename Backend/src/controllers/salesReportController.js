const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const salesReportService = require('../services/salesReportService');

const formatLabel = (label) => label
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, (letter) => letter.toUpperCase());

const formatValue = (value) => {
  if (typeof value === 'number') {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (value === null || value === undefined) {
    return '-';
  }
  return String(value);
};

const flattenReportRows = (reportType, reportData) => {
  if (reportType === 'summary' || reportType === 'gst-summary' || reportType === 'scheme-analysis' || reportType === 'profit-analysis') {
    return Object.entries(reportData || {}).map(([metric, value]) => ({
      metric: formatLabel(metric),
      value: formatValue(value),
    }));
  }

  if (reportType === 'by-customer') return reportData.customers || [];
  if (reportType === 'by-item') return reportData.items || [];
  if (reportType === 'by-salesman') return reportData.salesmen || [];
  if (reportType === 'by-route') return reportData.routes || [];
  if (reportType === 'by-category') return reportData.categories || [];

  return [];
};

const writeReportPDF = (res, reportTitle, reportType, reportData, filters) => {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
  const filename = `${reportTitle.replace(/ /g, '_')}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);
  doc.fontSize(18).font('Helvetica-Bold').text(reportTitle, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica');

  if (filters.startDate || filters.endDate) {
    doc.text(`Period: ${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`, { align: 'center' });
  }
  doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown();

  const rows = flattenReportRows(reportType, reportData);
  if (!rows.length) {
    doc.text('No rows found for the selected filters.');
    doc.end();
    return;
  }

  const keys = Object.keys(rows[0]);
  const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columnWidth = availableWidth / keys.length;
  let y = doc.y;

  const writeHeader = () => {
    doc.font('Helvetica-Bold').fontSize(8);
    keys.forEach((key, index) => {
      doc.text(formatLabel(key), doc.page.margins.left + (index * columnWidth), y, {
        width: columnWidth - 4,
      });
    });
    y += 18;
    doc.moveTo(doc.page.margins.left, y - 5).lineTo(doc.page.width - doc.page.margins.right, y - 5).stroke();
    doc.font('Helvetica').fontSize(8);
  };

  writeHeader();

  rows.forEach((row) => {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.y;
      writeHeader();
    }

    keys.forEach((key, index) => {
      doc.text(formatValue(row[key]), doc.page.margins.left + (index * columnWidth), y, {
        width: columnWidth - 4,
      });
    });
    y += 16;
  });

  doc.end();
};

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
      return writeReportPDF(res, reportTitle, reportType, reportData, filters);
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
