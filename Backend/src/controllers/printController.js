const printTemplateService = require('../services/printTemplateService');
const PDFDocument = require('pdfkit');

/**
 * Print Controller
 * Phase 2 - Requirement 19: Multiple Print Formats and Templates
 * Task 63: Create print API endpoints
 */
class PrintController {
  constructor() {
    Object.getOwnPropertyNames(PrintController.prototype)
      .filter((method) => method !== 'constructor' && typeof this[method] === 'function')
      .forEach((method) => {
        this[method] = this[method].bind(this);
      });
  }

  /**
     * Get print data for invoice
     * Task 63.1 - Requirement 19.1
     * GET /api/invoices/:id/print
     * Query params: format (optional)
     */
  async getPrintData(req, res) {
    try {
      const { id } = req.params;
      const { format } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invoice ID is required',
        });
      }

      const printData = await printTemplateService.generatePrintData(id, format);

      res.status(200).json({
        success: true,
        data: printData,
      });
    } catch (error) {
      console.error('Error generating print data:', error);

      if (error.message === 'Invoice not found') {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
      }

      if (error.message.includes('Invalid print format')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate print data',
      });
    }
  }

  /**
     * Generate PDF for invoice
     * Task 63.2 - Requirement 19.1
     * GET /api/invoices/:id/pdf
     * Query params: format (optional)
     *
     * Streams a PDF generated from invoice print data.
     */
  async generatePDF(req, res) {
    try {
      const { id } = req.params;
      const { format } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Invoice ID is required',
        });
      }

      const printData = await printTemplateService.generatePrintData(id, format);
      const filename = `invoice-${printData.invoice.invoiceNumber || id}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

      const doc = new PDFDocument({ size: 'A4', margin: 45 });
      doc.on('error', (pdfError) => {
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: pdfError.message || 'Failed to generate PDF',
          });
        } else {
          res.end();
        }
      });
      doc.pipe(res);

      this.writeInvoicePdf(doc, printData);
      doc.end();
    } catch (error) {
      console.error('Error generating PDF:', error);

      if (error.message === 'Invoice not found') {
        return res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
      }

      if (error.message.includes('Invalid print format')) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate PDF',
      });
    }
  }

  writeInvoicePdf(doc, printData) {
    const { invoice, party, items, totals, metadata } = printData;

    doc.fontSize(18).font('Helvetica-Bold').text(metadata.documentLabel || 'Invoice', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice #: ${invoice.invoiceNumber || '-'}`);
    doc.text(`Date: ${invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-'}`);
    doc.text(`Status: ${invoice.status || '-'}`);
    doc.text(`Payment Status: ${invoice.paymentStatus || '-'}`);
    doc.moveDown();

    if (party) {
      doc.font('Helvetica-Bold').text('Party');
      doc.font('Helvetica');
      doc.text(`${party.code || '-'} - ${party.name || '-'}`);
      if (party.address) doc.text(party.address);
      if (party.city || party.phone) doc.text([party.city, party.phone].filter(Boolean).join(' | '));
      if (party.gstNumber) doc.text(`GST/NTN: ${party.gstNumber}`);
      doc.moveDown();
    }

    this.writeItemsTable(doc, items || []);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Totals', { align: 'right' });
    doc.font('Helvetica');
    Object.entries(totals || {}).forEach(([label, value]) => {
      if (value !== undefined && value !== null) {
        doc.text(`${this.formatLabel(label)}: ${this.formatAmount(value)}`, { align: 'right' });
      }
    });

    if (invoice.notes) {
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Notes');
      doc.font('Helvetica').text(invoice.notes);
    }

    doc.moveDown(2);
    doc.fontSize(8).text(`Generated at ${new Date(printData.generatedAt).toLocaleString()}`, { align: 'right' });
  }

  writeItemsTable(doc, items) {
    const columns = [
      { label: '#', width: 25 },
      { label: 'Item', width: 210 },
      { label: 'Qty', width: 55, align: 'right' },
      { label: 'Rate', width: 70, align: 'right' },
      { label: 'Tax', width: 70, align: 'right' },
      { label: 'Total', width: 85, align: 'right' },
    ];
    const startX = doc.x;
    let y = doc.y;

    doc.font('Helvetica-Bold').fontSize(9);
    columns.reduce((x, column) => {
      doc.text(column.label, x, y, { width: column.width, align: column.align || 'left' });
      return x + column.width;
    }, startX);
    y += 18;
    doc.moveTo(startX, y - 4).lineTo(startX + columns.reduce((sum, column) => sum + column.width, 0), y - 4).stroke();

    doc.font('Helvetica').fontSize(9);
    items.forEach((item, index) => {
      if (y > doc.page.height - 90) {
        doc.addPage();
        y = doc.y;
      }

      const row = [
        String(index + 1),
        `${item.itemCode || ''} ${item.itemName || '-'}`.trim(),
        this.formatAmount(item.quantity),
        this.formatAmount(item.unitPrice),
        this.formatAmount((item.gstAmount || 0) + (item.advanceTaxAmount || 0)),
        this.formatAmount(item.lineTotal),
      ];

      columns.reduce((x, column, columnIndex) => {
        doc.text(row[columnIndex], x, y, { width: column.width, align: column.align || 'left' });
        return x + column.width;
      }, startX);
      y += 18;
    });

    doc.y = y;
  }

  formatLabel(label) {
    return label.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
  }

  formatAmount(value) {
    if (typeof value !== 'number') return value;
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
     * Get available print formats
     * GET /api/print/formats
     */
  async getAvailableFormats(req, res) {
    try {
      const formats = printTemplateService.getAvailableFormats();

      res.status(200).json({
        success: true,
        data: formats,
      });
    } catch (error) {
      console.error('Error getting formats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get available formats',
      });
    }
  }
}

module.exports = new PrintController();
