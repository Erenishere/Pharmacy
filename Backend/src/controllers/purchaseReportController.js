const purchaseReportService = require('../services/purchaseReportService');

/**
 * Purchase Report Controller
 * Requirement 6: Purchase Performance Tracking
 * Handles HTTP requests for purchase reports
 */
class PurchaseReportController {
  /**
   * Get purchase summary report
   * @route GET /api/purchase-reports/summary
   */
  async getPurchaseSummary(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      const summary = await purchaseReportService.getPurchaseSummary(dateFrom, dateTo);

      res.status(200).json({
        success: true,
        data: summary,
        message: 'Purchase summary retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get purchase summary error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to retrieve purchase summary',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get purchase by supplier report
   * @route GET /api/purchase-reports/by-supplier
   */
  async getPurchaseBySupplier(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      const report = await purchaseReportService.getPurchaseBySupplier(dateFrom, dateTo);

      res.status(200).json({
        success: true,
        data: report,
        message: 'Purchase by supplier report retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get purchase by supplier error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to retrieve purchase by supplier report',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get purchase by item report
   * @route GET /api/purchase-reports/by-item
   */
  async getPurchaseByItem(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      const report = await purchaseReportService.getPurchaseByItem(dateFrom, dateTo);

      res.status(200).json({
        success: true,
        data: report,
        message: 'Purchase by item report retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get purchase by item error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to retrieve purchase by item report',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get purchase analysis report
   * @route GET /api/purchase-reports/analysis
   */
  async getPurchaseAnalysis(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      const report = await purchaseReportService.getPurchaseAnalysis(dateFrom, dateTo);

      res.status(200).json({
        success: true,
        data: report,
        message: 'Purchase analysis report retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get purchase analysis error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to retrieve purchase analysis report',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get GST input summary report
   * @route GET /api/purchase-reports/gst-input-summary
   */
  async getGSTInputSummary(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      const report = await purchaseReportService.getGSTInputSummary(dateFrom, dateTo);

      res.status(200).json({
        success: true,
        data: report,
        message: 'GST input summary retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get GST input summary error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to retrieve GST input summary',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get supplier aging report
   * @route GET /api/purchase-reports/supplier-aging
   */
  async getSupplierAgingReport(req, res) {
    try {
      const report = await purchaseReportService.getSupplierAgingReport();

      res.status(200).json({
        success: true,
        data: report,
        message: 'Supplier aging report retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get supplier aging report error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to retrieve supplier aging report',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get payment due report
   * @route GET /api/purchase-reports/payment-due
   */
  async getPaymentDueReport(req, res) {
    try {
      const { dateTo } = req.query;

      const report = await purchaseReportService.getPaymentDueReport(dateTo);

      res.status(200).json({
        success: true,
        data: report,
        message: 'Payment due report retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get payment due report error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to retrieve payment due report',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get purchase vs sales comparison
   * @route GET /api/purchase-reports/vs-sales
   */
  async getPurchaseVsSalesComparison(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      const report = await purchaseReportService.getPurchaseVsSalesComparison(dateFrom, dateTo);

      res.status(200).json({
        success: true,
        data: report,
        message: 'Purchase vs sales comparison retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get purchase vs sales comparison error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to retrieve purchase vs sales comparison',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get outstanding purchase orders
   * @route GET /api/purchase-reports/outstanding-pos
   */
  async getOutstandingPOs(req, res) {
    try {
      const { supplierId, startDate, endDate } = req.query;

      const report = await purchaseReportService.getOutstandingPOs({
        supplierId,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: report,
        message: 'Outstanding purchase orders retrieved successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Get outstanding POs error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to retrieve outstanding purchase orders',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Export purchase report
   * @route POST /api/purchase-reports/export
   */
  async exportReport(req, res) {
    try {
      const {
        reportType, format, dateFrom, dateTo, ...otherParams
      } = req.body;

      // Validate required parameters
      if (!reportType) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Report type is required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      if (!format || !['csv', 'excel', 'pdf'].includes(format.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid format (csv, excel, pdf) is required',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get report data based on type
      let reportData;
      let reportTitle;
      let columns;

      switch (reportType) {
        case 'summary':
          reportData = await purchaseReportService.getPurchaseSummary(dateFrom, dateTo);
          reportTitle = 'Purchase Summary Report';
          columns = [
            { key: 'totalInvoices', label: 'Total Invoices' },
            { key: 'purchaseInvoices', label: 'Purchase Invoices' },
            { key: 'returnInvoices', label: 'Return Invoices' },
            { key: 'totalPurchaseAmount', label: 'Total Purchase Amount' },
            { key: 'totalReturnAmount', label: 'Total Return Amount' },
            { key: 'netAmount', label: 'Net Amount' },
            { key: 'averageInvoiceValue', label: 'Average Invoice Value' },
          ];
          // Convert summary object to array for export
          reportData = [reportData];
          break;

        case 'by-supplier':
          reportData = await purchaseReportService.getPurchaseBySupplier(dateFrom, dateTo);
          reportTitle = 'Purchase by Supplier Report';
          columns = [
            { key: 'supplierName', label: 'Supplier Name' },
            { key: 'supplierCode', label: 'Supplier Code' },
            { key: 'town', label: 'Town' },
            { key: 'invoiceCount', label: 'Invoice Count' },
            { key: 'totalAmount', label: 'Total Amount' },
            { key: 'totalGST', label: 'Total GST' },
          ];
          break;

        case 'by-item':
          reportData = await purchaseReportService.getPurchaseByItem(dateFrom, dateTo);
          reportTitle = 'Purchase by Item Report';
          columns = [
            { key: 'itemName', label: 'Item Name' },
            { key: 'itemCode', label: 'Item Code' },
            { key: 'category', label: 'Category' },
            { key: 'totalQuantity', label: 'Total Quantity' },
            { key: 'totalBoxQty', label: 'Total Box Qty' },
            { key: 'totalUnitQty', label: 'Total Unit Qty' },
            { key: 'totalAmount', label: 'Total Amount' },
            { key: 'totalGST', label: 'Total GST' },
          ];
          break;

        case 'analysis':
          reportData = await purchaseReportService.getPurchaseAnalysis(dateFrom, dateTo);
          reportTitle = 'Purchase Analysis Report';
          // Flatten the analysis object for export
          reportData = [{
            totalPurchaseValue: reportData.costAnalysis.totalPurchaseValue,
            totalQuantity: reportData.costAnalysis.totalQuantity,
            averageCostPerUnit: reportData.costAnalysis.averageCostPerUnit,
            itemCount: reportData.costAnalysis.itemCount,
            invoiceCount: reportData.costAnalysis.invoiceCount,
            totalSchemeUnits: reportData.schemeAnalysis.totalSchemeUnits,
            schemePercentage: reportData.schemeAnalysis.schemePercentage,
            totalDiscounts: reportData.discountAnalysis.totalDiscounts,
            discountPercentage: reportData.discountAnalysis.discountPercentage,
            gst18: reportData.taxAnalysis.gst18,
            gst4: reportData.taxAnalysis.gst4,
            totalGST: reportData.taxAnalysis.totalGST,
            advanceTax: reportData.taxAnalysis.advanceTax,
          }];
          columns = [
            { key: 'totalPurchaseValue', label: 'Total Purchase Value' },
            { key: 'totalQuantity', label: 'Total Quantity' },
            { key: 'averageCostPerUnit', label: 'Average Cost Per Unit' },
            { key: 'itemCount', label: 'Item Count' },
            { key: 'invoiceCount', label: 'Invoice Count' },
            { key: 'totalSchemeUnits', label: 'Total Scheme Units' },
            { key: 'schemePercentage', label: 'Scheme %' },
            { key: 'totalDiscounts', label: 'Total Discounts' },
            { key: 'discountPercentage', label: 'Discount %' },
            { key: 'gst18', label: 'GST 18%' },
            { key: 'gst4', label: 'GST 4%' },
            { key: 'totalGST', label: 'Total GST' },
            { key: 'advanceTax', label: 'Advance Tax' },
          ];
          break;

        case 'gst-input-summary':
          reportData = await purchaseReportService.getGSTInputSummary(dateFrom, dateTo);
          reportTitle = 'GST Input Summary Report';
          columns = [
            { key: 'gst18', label: 'GST 18%' },
            { key: 'gst4', label: 'GST 4%' },
            { key: 'totalInputGST', label: 'Total Input GST' },
            { key: 'advanceTax', label: 'Advance Tax' },
            { key: 'nonFilerGST', label: 'Non-Filer GST' },
          ];
          reportData = [reportData];
          break;

        case 'supplier-aging':
          reportData = await purchaseReportService.getSupplierAgingReport();
          reportTitle = 'Supplier Aging Report';
          // Flatten supplier aging data
          const flattenedData = [];
          reportData.suppliers.forEach((supplier) => {
            supplier.aging.forEach((aging) => {
              flattenedData.push({
                supplierName: supplier.supplierName,
                agingBucket: aging.bucket,
                amount: aging.amount,
                invoiceCount: aging.invoices.length,
              });
            });
          });
          reportData = flattenedData;
          columns = [
            { key: 'supplierName', label: 'Supplier Name' },
            { key: 'agingBucket', label: 'Aging Bucket' },
            { key: 'amount', label: 'Amount' },
            { key: 'invoiceCount', label: 'Invoice Count' },
          ];
          break;

        case 'payment-due':
          reportData = await purchaseReportService.getPaymentDueReport(dateTo);
          reportTitle = 'Payment Due Report';
          reportData = reportData.invoices;
          columns = [
            { key: 'invoiceNumber', label: 'Invoice Number' },
            { key: 'invoiceDate', label: 'Invoice Date' },
            { key: 'dueDate', label: 'Due Date' },
            { key: 'supplierName', label: 'Supplier Name' },
            { key: 'grandTotal', label: 'Grand Total' },
            { key: 'dueAmount', label: 'Due Amount' },
            { key: 'paymentStatus', label: 'Payment Status' },
          ];
          break;

        case 'vs-sales':
          reportData = await purchaseReportService.getPurchaseVsSalesComparison(dateFrom, dateTo);
          reportTitle = 'Purchase vs Sales Comparison Report';
          reportData = reportData.comparison;
          columns = [
            { key: 'month', label: 'Month' },
            { key: 'purchase.amount', label: 'Purchase Amount' },
            { key: 'purchase.invoiceCount', label: 'Purchase Invoices' },
            { key: 'sales.amount', label: 'Sales Amount' },
            { key: 'sales.invoiceCount', label: 'Sales Invoices' },
            { key: 'difference.amount', label: 'Difference' },
          ];
          break;

        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid report type',
            },
            timestamp: new Date().toISOString(),
          });
      }

      // Check if data exists
      if (!reportData || reportData.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NO_DATA',
            message: 'No data available for the selected report',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Import export service
      const exportService = require('../services/exportService');

      // Generate export based on format
      let buffer;
      let contentType;
      let filename;

      const timestamp = new Date().toISOString().split('T')[0];

      if (format.toLowerCase() === 'csv') {
        buffer = exportService.exportToCSV(reportData, columns);
        contentType = 'text/csv';
        filename = `${reportType}_${timestamp}.csv`;
      } else if (format.toLowerCase() === 'excel') {
        buffer = await exportService.exportToExcel(reportData, columns, reportTitle);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${reportType}_${timestamp}.xlsx`;
      } else if (format.toLowerCase() === 'pdf') {
        buffer = await exportService.exportToPDF({
          title: reportTitle,
          data: reportData,
          columns,
          dateRange: dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All Time',
        });
        contentType = 'application/pdf';
        filename = `${reportType}_${timestamp}.pdf`;
      }

      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Send buffer
      res.send(buffer);
    } catch (error) {
      console.error('Export report error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to export report',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}

module.exports = new PurchaseReportController();
