const Invoice = require('../models/Invoice');

/**
 * Tax Report Service
 * Handles business logic for tax reporting (GST, WHT, compliance)
 */
class TaxReportService {
  /**
   * Generate GST sales report
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} GST sales report
   */
  async getGSTSalesReport(startDate, endDate) {
    const salesInvoices = await Invoice.find({
      type: 'sales',
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' },
    })
      .populate('customerId', 'name ntn gstNumber')
      .lean();

    const gstSales = salesInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customer: inv.customerId,
      taxableAmount: inv.totals.subtotal,
      gstAmount: inv.totals.totalTax,
      totalAmount: inv.totals.grandTotal,
      gstRate: inv.items[0]?.gstRate || 0,
    }));

    const summary = {
      totalInvoices: gstSales.length,
      totalTaxableAmount: gstSales.reduce((sum, s) => sum + s.taxableAmount, 0),
      totalGSTAmount: gstSales.reduce((sum, s) => sum + s.gstAmount, 0),
      totalAmount: gstSales.reduce((sum, s) => sum + s.totalAmount, 0),
    };

    return {
      reportType: 'gst_sales',
      period: { startDate, endDate },
      sales: gstSales,
      summary,
    };
  }

  /**
   * Generate GST purchase report
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} GST purchase report
   */
  async getGSTPurchaseReport(startDate, endDate) {
    const purchaseInvoices = await Invoice.find({
      type: 'purchase',
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' },
    })
      .populate('supplierId', 'name ntn gstNumber')
      .lean();

    const gstPurchases = purchaseInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      supplier: inv.supplierId,
      taxableAmount: inv.totals.subtotal,
      gstAmount: inv.totals.totalTax,
      totalAmount: inv.totals.grandTotal,
      gstRate: inv.items[0]?.gstRate || 0,
    }));

    const summary = {
      totalInvoices: gstPurchases.length,
      totalTaxableAmount: gstPurchases.reduce((sum, p) => sum + p.taxableAmount, 0),
      totalGSTAmount: gstPurchases.reduce((sum, p) => sum + p.gstAmount, 0),
      totalAmount: gstPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
    };

    return {
      reportType: 'gst_purchase',
      period: { startDate, endDate },
      purchases: gstPurchases,
      summary,
    };
  }

  /**
   * Generate withholding tax report
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} WHT report
   */
  async getWHTReport(startDate, endDate) {
    const salesInvoices = await Invoice.find({
      type: 'sales',
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' },
      withholdingTax: { $gt: 0 },
    })
      .populate('customerId', 'name ntn')
      .lean();

    const whtTransactions = salesInvoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customer: inv.customerId,
      taxableAmount: inv.totals.subtotal,
      whtRate: inv.withholdingTaxRate || 0,
      whtAmount: inv.withholdingTax || 0,
      netAmount: inv.totals.grandTotal - (inv.withholdingTax || 0),
    }));

    const summary = {
      totalTransactions: whtTransactions.length,
      totalTaxableAmount: whtTransactions.reduce((sum, t) => sum + t.taxableAmount, 0),
      totalWHTAmount: whtTransactions.reduce((sum, t) => sum + t.whtAmount, 0),
      totalNetAmount: whtTransactions.reduce((sum, t) => sum + t.netAmount, 0),
    };

    return {
      reportType: 'withholding_tax',
      period: { startDate, endDate },
      transactions: whtTransactions,
      summary,
    };
  }

  /**
   * Generate tax compliance summary
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Tax compliance summary
   */
  async getTaxComplianceSummary(startDate, endDate) {
    const [gstSales, gstPurchases, wht] = await Promise.all([
      this.getGSTSalesReport(startDate, endDate),
      this.getGSTPurchaseReport(startDate, endDate),
      this.getWHTReport(startDate, endDate),
    ]);

    const netGST = gstSales.summary.totalGSTAmount - gstPurchases.summary.totalGSTAmount;

    return {
      reportType: 'tax_compliance_summary',
      period: { startDate, endDate },
      gstSales: gstSales.summary,
      gstPurchases: gstPurchases.summary,
      netGSTPayable: netGST,
      withholdingTax: wht.summary,
      totalTaxLiability: netGST + wht.summary.totalWHTAmount,
    };
  }
}

module.exports = new TaxReportService();
