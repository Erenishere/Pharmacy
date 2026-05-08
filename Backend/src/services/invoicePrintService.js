const PDFDocument = require('pdfkit');
const Invoice = require('../models/Invoice');
const AppError = require('../utils/appError');

/**
 * Invoice Print Service
 * Handles PDF generation for sales invoices using PDFKit
 * Requirements: 6.1-6.10
 */
class InvoicePrintService {
  /**
   * Generate invoice PDF
   * @param {string} invoiceId - Invoice ID
   * @param {Object} options - Print options
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateInvoicePDF(invoiceId, options = {}) {
    const {
      template = 'standard',
      includeHeader = true,
      includeFooter = true,
      includeWarranty = true,
    } = options;

    // Fetch invoice with populated references
    const invoice = await Invoice.findById(invoiceId)
      .populate('customerId', 'name address town phone email balance')
      .populate('salesmanId', 'name')
      .populate('items.itemId', 'name code company')
      .populate('createdBy', 'name')
      .lean();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.type !== 'sales' && invoice.type !== 'return_sales') {
      throw new Error('Invoice is not a sales invoice');
    }

    return this._generatePDF(invoice, { template, includeHeader, includeFooter, includeWarranty });
  }

  /**
   * Generate PDF document
   * @private
   */
  async _generatePDF(invoice, options) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate content based on template
        switch (options.template) {
          case 'standard':
            this._generateStandardTemplate(doc, invoice, options);
            break;
          case 'detailed':
            this._generateDetailedTemplate(doc, invoice, options);
            break;
          case 'compact':
            this._generateCompactTemplate(doc, invoice, options);
            break;
          default:
            this._generateStandardTemplate(doc, invoice, options);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate standard invoice template
   * @private
   */
  _generateStandardTemplate(doc, invoice, options) {
    // Header
    if (options.includeHeader) {
      this._drawHeader(doc, invoice);
    }

    // Invoice details
    this._drawInvoiceDetails(doc, invoice);

    // Customer information
    this._drawCustomerInfo(doc, invoice);

    // Items table
    this._drawItemsTable(doc, invoice);

    // Totals
    this._drawTotals(doc, invoice);

    // Payment terms and notes
    this._drawPaymentTerms(doc, invoice);

    // Warranty information
    if (options.includeWarranty && invoice.warrantyInfo) {
      this._drawWarrantyInfo(doc, invoice);
    }

    // Footer
    if (options.includeFooter) {
      this._drawFooter(doc, invoice);
    }
  }

  /**
   * Generate detailed invoice template
   * @private
   */
  _generateDetailedTemplate(doc, invoice, options) {
    // Similar to standard but with more details
    this._generateStandardTemplate(doc, invoice, options);
  }

  /**
   * Generate compact invoice template
   * @private
   */
  _generateCompactTemplate(doc, invoice, options) {
    // Compact version with minimal spacing
    this._generateStandardTemplate(doc, invoice, options);
  }

  /**
   * Draw header with company logo and address
   * @private
   */
  _drawHeader(doc, invoice) {
    // Company name
    doc.fontSize(20).font('Helvetica-Bold').text('INDUS TRADERS', { align: 'center' });
    doc.moveDown(0.5);
    
    // Company address
    doc.fontSize(10).font('Helvetica').text('Pharmaceutical Distribution', { align: 'center' });
    doc.text('Address Line 1, City, Country', { align: 'center' });
    doc.text('Phone: +92-XXX-XXXXXXX | Email: info@industraders.com', { align: 'center' });
    doc.moveDown(1);
    
    // Invoice title
    const title = invoice.salesType === 'return' ? 'SALES RETURN INVOICE' : 'SALES INVOICE';
    doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(1);
  }

  /**
   * Draw invoice details
   * @private
   */
  _drawInvoiceDetails(doc, invoice) {
    const startY = doc.y;
    
    // Left column
    doc.fontSize(10).font('Helvetica-Bold').text('Invoice No:', 50, startY);
    doc.font('Helvetica').text(invoice.invoiceNumber || 'N/A', 150, startY);
    
    doc.font('Helvetica-Bold').text('Invoice Date:', 50, startY + 15);
    doc.font('Helvetica').text(new Date(invoice.invoiceDate).toLocaleDateString(), 150, startY + 15);
    
    if (invoice.dueDate) {
      doc.font('Helvetica-Bold').text('Due Date:', 50, startY + 30);
      doc.font('Helvetica').text(new Date(invoice.dueDate).toLocaleDateString(), 150, startY + 30);
    }
    
    // Right column
    if (invoice.salesmanId) {
      doc.font('Helvetica-Bold').text('Salesman:', 350, startY);
      doc.font('Helvetica').text(invoice.salesmanId.name || 'N/A', 450, startY);
    }
    
    if (invoice.memoNo) {
      doc.font('Helvetica-Bold').text('Memo No:', 350, startY + 15);
      doc.font('Helvetica').text(invoice.memoNo, 450, startY + 15);
    }
    
    doc.moveDown(3);
  }

  /**
   * Draw customer information
   * @private
   */
  _drawCustomerInfo(doc, invoice) {
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50);
    doc.moveDown(0.5);
    
    doc.fontSize(10).font('Helvetica-Bold').text(invoice.customerId?.name || invoice.customerName || 'N/A', 50);
    
    if (invoice.customerId?.address) {
      doc.font('Helvetica').text(invoice.customerId.address, 50);
    }
    
    if (invoice.customerTown || invoice.customerId?.town) {
      doc.text(invoice.customerTown || invoice.customerId.town, 50);
    }
    
    if (invoice.customerId?.phone) {
      doc.text(`Phone: ${invoice.customerId.phone}`, 50);
    }
    
    // Previous balance
    if (invoice.previousBalance) {
      doc.font('Helvetica-Bold').text(`Previous Balance: Rs. ${invoice.previousBalance.toFixed(2)}`, 50);
    }
    
    doc.moveDown(1);
  }

  /**
   * Draw items table
   * @private
   */
  _drawItemsTable(doc, invoice) {
    const tableTop = doc.y;
    const itemHeight = 20;
    
    // Table headers
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('S#', 50, tableTop, { width: 30 });
    doc.text('Item Name', 80, tableTop, { width: 150 });
    doc.text('Qty', 230, tableTop, { width: 40 });
    doc.text('Rate', 270, tableTop, { width: 50 });
    doc.text('Disc%', 320, tableTop, { width: 40 });
    doc.text('GST', 360, tableTop, { width: 50 });
    doc.text('Amount', 410, tableTop, { width: 70 });
    
    // Draw line under headers
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    let yPos = tableTop + 20;
    
    // Table rows
    doc.font('Helvetica').fontSize(8);
    invoice.items.forEach((item, index) => {
      // Check if we need a new page
      if (yPos > 700) {
        doc.addPage();
        yPos = 50;
      }
      
      const itemName = item.itemId?.name || item.itemName || 'Unknown';
      const quantity = item.totalUnitQty || item.quantity || 0;
      const rate = item.unitTP || item.unitPrice || 0;
      const discount = item.discount1Percent || item.discount || 0;
      const gst = item.gstTotal || item.taxAmount || 0;
      const amount = item.netAmount || item.lineTotal || 0;
      
      doc.text(index + 1, 50, yPos, { width: 30 });
      doc.text(itemName, 80, yPos, { width: 150 });
      doc.text(quantity.toString(), 230, yPos, { width: 40 });
      doc.text(rate.toFixed(2), 270, yPos, { width: 50 });
      doc.text(discount.toFixed(1), 320, yPos, { width: 40 });
      doc.text(gst.toFixed(2), 360, yPos, { width: 50 });
      doc.text(amount.toFixed(2), 410, yPos, { width: 70, align: 'right' });
      
      yPos += itemHeight;
    });
    
    // Draw line after items
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    doc.y = yPos + 10;
  }

  /**
   * Draw totals section
   * @private
   */
  _drawTotals(doc, invoice) {
    const totals = invoice.totals || {};
    const startY = doc.y;
    
    doc.fontSize(10).font('Helvetica');
    
    // Gross Total
    doc.text('Gross Total:', 350, startY);
    doc.text(`Rs. ${(totals.grossTotal || 0).toFixed(2)}`, 450, startY, { align: 'right' });
    
    // Discount
    if (totals.discountTotal) {
      doc.text('Discount:', 350, startY + 15);
      doc.text(`Rs. ${totals.discountTotal.toFixed(2)}`, 450, startY + 15, { align: 'right' });
    }
    
    // GST
    if (totals.gstTotal) {
      doc.text('GST (18%):', 350, startY + 30);
      doc.text(`Rs. ${totals.gstTotal.toFixed(2)}`, 450, startY + 30, { align: 'right' });
    }
    
    // Advance Tax
    if (totals.advanceTaxTotal) {
      doc.text(`Advance Tax (${invoice.advanceTaxRate || 0}%):`, 350, startY + 45);
      doc.text(`Rs. ${totals.advanceTaxTotal.toFixed(2)}`, 450, startY + 45, { align: 'right' });
    }
    
    // Non-filer GST
    if (totals.nonFilerGst) {
      doc.text('Non-filer GST (0.1%):', 350, startY + 60);
      doc.text(`Rs. ${totals.nonFilerGst.toFixed(2)}`, 450, startY + 60, { align: 'right' });
    }
    
    // Net Total
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Net Total:', 350, startY + 80);
    doc.text(`Rs. ${(totals.netBillTotal || totals.grandTotal || 0).toFixed(2)}`, 450, startY + 80, { align: 'right' });
    
    doc.moveDown(3);
  }

  /**
   * Draw payment terms
   * @private
   */
  _drawPaymentTerms(doc, invoice) {
    if (invoice.creditDays) {
      doc.fontSize(10).font('Helvetica-Bold').text('Payment Terms:', 50);
      doc.font('Helvetica').text(`Credit Days: ${invoice.creditDays}`, 50);
      doc.moveDown(0.5);
    }
    
    if (invoice.detailNote) {
      doc.font('Helvetica-Bold').text('Notes:', 50);
      doc.font('Helvetica').text(invoice.detailNote, 50, doc.y, { width: 500 });
      doc.moveDown(0.5);
    }
  }

  /**
   * Draw warranty information
   * @private
   */
  _drawWarrantyInfo(doc, invoice) {
    doc.fontSize(10).font('Helvetica-Bold').text('Warranty Information:', 50);
    doc.font('Helvetica').text(invoice.warrantyInfo, 50, doc.y, { width: 500 });
    doc.moveDown(1);
  }

  /**
   * Draw footer
   * @private
   */
  _drawFooter(doc, invoice) {
    const bottomY = doc.page.height - 100;
    
    doc.fontSize(8).font('Helvetica');
    doc.text('Thank you for your business!', 50, bottomY, { align: 'center' });
    doc.text('This is a computer-generated invoice and does not require a signature.', 50, bottomY + 15, { align: 'center' });
    
    if (invoice.createdBy) {
      doc.text(`Generated by: ${invoice.createdBy.name || 'System'}`, 50, bottomY + 30, { align: 'center' });
    }
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, bottomY + 45, { align: 'center' });
  }

  /**
   * Generate invoice PDF for bulk printing
   * @param {Array} invoiceIds - Array of invoice IDs
   * @returns {Promise<Buffer>} Combined PDF buffer
   */
  async generateBulkInvoicePDF(invoiceIds) {
    if (!invoiceIds || invoiceIds.length === 0) {
      throw new Error('No invoice IDs provided');
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Generate each invoice
    for (let i = 0; i < invoiceIds.length; i++) {
      const invoice = await Invoice.findById(invoiceIds[i])
        .populate('customerId', 'name address town phone email balance')
        .populate('salesmanId', 'name')
        .populate('items.itemId', 'name code company')
        .populate('createdBy', 'name')
        .lean();

      if (invoice && (invoice.type === 'sales' || invoice.type === 'return_sales')) {
        if (i > 0) {
          doc.addPage();
        }
        this._generateStandardTemplate(doc, invoice, {
          includeHeader: true,
          includeFooter: true,
          includeWarranty: true,
        });
      }
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });
  }

  /**
   * Email invoice PDF to customer
   * @param {string} invoiceId - Invoice ID
   * @param {Object} emailOptions - Email options
   * @returns {Promise<Object>} Email result
   */
  async emailInvoicePDF(invoiceId, emailOptions = {}) {
    const invoice = await Invoice.findById(invoiceId)
      .populate('customerId', 'name email')
      .lean();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (!invoice.customerId?.email) {
      throw new Error('Customer email not found');
    }

    await this.generateInvoicePDF(invoiceId);

    throw new AppError(
      'Invoice email delivery is not configured. Use the print/download endpoint until SMTP settings are available.',
      501,
    );
  }

  /**
   * Format invoice line items for print payloads.
   * @returns {Array} Formatted items
   */
  _formatItems(items) {
    return items.map((item, index) => ({
      sno: index + 1,
      itemId: item.itemId?._id,
      itemName: item.itemId?.name || 'Unknown',
      itemCode: item.itemId?.code || '',
      description: item.itemId?.description || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      // Box/Unit quantities
      boxQuantity: item.boxQuantity || 0,
      unitQuantity: item.unitQuantity || 0,
      boxRate: item.boxRate || 0,
      unitRate: item.unitRate || 0,
      // Discounts
      discount: item.discount || 0,
      discount1Percent: item.discount1Percent || 0,
      discount1Amount: item.discount1Amount || 0,
      discount2Percent: item.discount2Percent || 0,
      discount2Amount: item.discount2Amount || 0,
      // Schemes
      scheme1Quantity: item.scheme1Quantity || 0,
      scheme2Quantity: item.scheme2Quantity || 0,
      // Tax
      taxAmount: item.taxAmount || 0,
      advanceTaxPercent: item.advanceTaxPercent || 0,
      advanceTaxAmount: item.advanceTaxAmount || 0,
      // Total
      lineTotal: item.lineTotal,
      // Warranty
      warrantyMonths: item.warrantyMonths || 0,
      warrantyDetails: item.warrantyDetails || '',
      // Warehouse
      warehouseId: item.warehouseId,
      // Dimension
      dimension: item.dimension
    }));
  }

  /**
   * Format party (customer/supplier) information
   * @param {Object} party - Party object
   * @returns {Object} Formatted party info
   */
  _formatPartyInfo(party) {
    if (!party) return null;

    return {
      _id: party._id,
      name: party.name,
      code: party.code,
      address: party.address,
      phone: party.phone,
      email: party.email
    };
  }

  /**
   * Get format-specific data
   * @param {Object} invoice - Invoice object
   * @param {string} format - Print format
   * @returns {Object} Format-specific data
   */
  _getFormatSpecificData(invoice, format) {
    const data = {};

    switch (format) {
      case 'estimate':
        data.isEstimate = true;
        data.estimatePrint = invoice.estimatePrint;
        data.title = 'ESTIMATE / QUOTATION';
        break;

      case 'voucher':
        data.isVoucher = true;
        data.title = 'PAYMENT VOUCHER';
        break;

      case 'store_copy':
        data.isStoreCopy = true;
        data.title = 'STORE COPY';
        data.watermark = 'STORE COPY - NOT FOR CUSTOMER';
        break;

      case 'tax_invoice':
        data.isTaxInvoice = true;
        data.title = 'TAX INVOICE';
        data.showTaxBreakdown = true;
        break;

      case 'warranty_bill':
        data.isWarrantyBill = true;
        data.title = 'WARRANTY BILL';
        data.showWarrantyDetails = true;
        break;

      case 'thermal':
        data.isThermal = true;
        data.paperWidth = '80mm';
        data.compactMode = true;
        break;

      case 'letterhead':
        data.isLetterhead = true;
        data.showCompanyHeader = true;
        break;

      case 'logo':
        data.showLogo = true;
        break;

      default:
        data.isStandard = true;
        data.title = 'INVOICE';
    }

    return data;
  }

  /**
   * Generate print preview URL
   * @param {string} invoiceId - Invoice ID
   * @param {string} format - Print format
   * @returns {string} Preview URL
   */
  generatePrintPreviewUrl(invoiceId, format = 'standard') {
    return `/api/invoices/${invoiceId}/print?format=${format}&preview=true`;
  }

  /**
   * Generate print download URL
   * @param {string} invoiceId - Invoice ID
   * @param {string} format - Print format
   * @returns {string} Download URL
   */
  generatePrintDownloadUrl(invoiceId, format = 'standard') {
    return `/api/invoices/${invoiceId}/print?format=${format}&download=true`;
  }

  /**
   * Validate print format
   * @param {string} format - Print format
   * @returns {boolean} Is valid
   */
  isValidFormat(format) {
    const validFormats = [
      'standard',
      'logo',
      'letterhead',
      'thermal',
      'estimate',
      'voucher',
      'store_copy',
      'tax_invoice',
      'warranty_bill'
    ];

    return validFormats.includes(format);
  }
}

module.exports = new InvoicePrintService();
