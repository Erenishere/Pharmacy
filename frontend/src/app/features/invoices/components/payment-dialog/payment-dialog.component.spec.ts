import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Invoice } from '../../models/invoice.model';

@Component({
  selector: 'app-invoice-print-preview',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './invoice-print-preview.component.html',
  styleUrl: './invoice-print-preview.component.scss'
})
export class InvoicePrintPreviewComponent implements OnInit {
  invoice: Invoice;
  companyName = 'Indus Traders';
  companyAddress = 'Pharmaceutical Wholesale & Distribution';
  companyPhone = '+92-XXX-XXXXXXX';
  companyEmail = 'info@industraders.com';
  companyNTN = 'NTN: XXXXXXX-X';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { invoice: Invoice },
    private dialogRef: MatDialogRef<InvoicePrintPreviewComponent>
  ) {
    this.invoice = data.invoice;
  }

  ngOnInit(): void {}

  close(): void {
    this.dialogRef.close();
  }

  print(): void {
    const printContent = document.getElementById('invoice-print-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${this.invoice.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            color: #333;
            line-height: 1.4;
          }
          .invoice-container { max-width: 210mm; margin: 0 auto; padding: 20px; }

          /* Header */
          .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #7367f0; }
          .company-info h1 { font-size: 28px; color: #7367f0; margin-bottom: 5px; font-weight: 700; }
          .company-info p { color: #666; font-size: 11px; margin: 2px 0; }
          .invoice-title { text-align: right; }
          .invoice-title h2 { font-size: 32px; color: #333; text-transform: uppercase; letter-spacing: 2px; }
          .invoice-title .invoice-number { font-size: 14px; color: #7367f0; font-weight: 600; margin-top: 5px; }
          .invoice-title .invoice-date { font-size: 12px; color: #666; margin-top: 3px; }

          /* Parties */
          .parties-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .party-box { width: 48%; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #7367f0; }
          .party-box h3 { font-size: 11px; color: #7367f0; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
          .party-box p { margin: 4px 0; font-size: 12px; }
          .party-box .name { font-weight: 600; font-size: 14px; color: #333; }

          /* Table */
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .items-table th { background: linear-gradient(135deg, #7367f0, #9e95f5); color: white; padding: 12px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          .items-table th:first-child { border-radius: 6px 0 0 0; }
          .items-table th:last-child { border-radius: 0 6px 0 0; text-align: right; }
          .items-table td { padding: 10px; border-bottom: 1px solid #eee; font-size: 12px; }
          .items-table td:last-child { text-align: right; }
          .items-table tr:nth-child(even) { background: #fafafa; }
          .items-table .item-code { font-size: 10px; color: #666; }
          .items-table .qty { text-align: center; }
          .items-table .price { text-align: right; }

          /* Totals */
          .totals-section { display: flex; justify-content: flex-end; margin-bottom: 30px; }
          .totals-box { width: 320px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 15px; border-bottom: 1px solid #eee; }
          .totals-row.subtotal { background: #f8f9fa; }
          .totals-row.grand-total { background: linear-gradient(135deg, #7367f0, #9e95f5); color: white; font-size: 16px; font-weight: 700; border-radius: 6px; margin-top: 5px; }
          .totals-row span:first-child { color: #666; }
          .totals-row.grand-total span { color: white; }

          /* Footer */
          .invoice-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
          .footer-notes { margin-bottom: 20px; }
          .footer-notes h4 { font-size: 11px; color: #7367f0; text-transform: uppercase; margin-bottom: 5px; }
          .footer-notes p { font-size: 11px; color: #666; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 11px; color: #666; }

          /* Status Badge */
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
          .status-draft { background: #fff3cd; color: #856404; }
          .status-confirmed { background: #d4edda; color: #155724; }
          .status-paid { background: #cce5ff; color: #004085; }
          .status-cancelled { background: #f8d7da; color: #721c24; }

          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  formatCurrency(amount: number): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'Rs. 0';
    }
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('PKR', 'Rs.');
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getCustomerName(): string {
    if (typeof this.invoice.customerId === 'object' && this.invoice.customerId?.name) {
      return this.invoice.customerId.name;
    }
    return this.invoice.customerName || 'Walk-in Customer';
  }

  getCustomerAddress(): string | undefined {
    if (typeof this.invoice.customerId === 'object') {
      return this.invoice.customerId?.address;
    }
    return undefined;
  }

  getCustomerPhone(): string | undefined {
    if (typeof this.invoice.customerId === 'object') {
      return this.invoice.customerId?.phone;
    }
    return undefined;
  }

  getCustomerNtn(): string | undefined {
    if (typeof this.invoice.customerId === 'object') {
      return this.invoice.customerId?.ntn;
    }
    return undefined;
  }

  getSalesmanName(): string {
    if (typeof this.invoice.salesmanId === 'object' && this.invoice.salesmanId?.name) {
      return this.invoice.salesmanId.name;
    }
    return '-';
  }
}
