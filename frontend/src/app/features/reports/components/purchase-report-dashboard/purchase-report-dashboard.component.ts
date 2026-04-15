import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { PurchaseReportService } from '../../services/purchase-report.service';

@Component({
  selector: 'app-purchase-report-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './purchase-report-dashboard.component.html',
  styleUrls: ['./purchase-report-dashboard.component.scss']
})
export class PurchaseReportDashboardComponent implements OnInit {
  dateRangeForm: FormGroup;
  selectedReport: string = 'summary';
  loading = false;
  reportData: any = null;

  reportTypes = [
    { value: 'summary', label: 'Purchase Summary', icon: 'summarize' },
    { value: 'by-supplier', label: 'Purchase by Supplier', icon: 'business' },
    { value: 'by-item', label: 'Purchase by Item', icon: 'inventory' },
    { value: 'analysis', label: 'Purchase Analysis', icon: 'analytics' },
    { value: 'gst-input', label: 'GST Input Summary', icon: 'receipt' },
    { value: 'supplier-aging', label: 'Supplier Aging', icon: 'schedule' },
    { value: 'payment-due', label: 'Payment Due', icon: 'payment' },
    { value: 'vs-sales', label: 'Purchase vs Sales', icon: 'compare' }
  ];

  constructor(
    private fb: FormBuilder,
    private reportService: PurchaseReportService,
    private snackBar: MatSnackBar
  ) {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.dateRangeForm = this.fb.group({
      dateFrom: [firstDay.toISOString().split('T')[0], Validators.required],
      dateTo: [today.toISOString().split('T')[0], Validators.required]
    });
  }

  ngOnInit(): void {
    this.generateReport();
  }

  onReportTypeChange(reportType: string): void {
    this.selectedReport = reportType;
    this.generateReport();
  }

  generateReport(): void {
    if (this.dateRangeForm.invalid) {
      this.snackBar.open('Please select valid date range', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const params = {
      dateFrom: this.dateRangeForm.get('dateFrom')?.value,
      dateTo: this.dateRangeForm.get('dateTo')?.value
    };

    let reportObservable;
    
    switch (this.selectedReport) {
      case 'summary':
        reportObservable = this.reportService.getPurchaseSummary(params);
        break;
      case 'by-supplier':
        reportObservable = this.reportService.getPurchaseBySupplier(params);
        break;
      case 'by-item':
        reportObservable = this.reportService.getPurchaseByItem(params);
        break;
      case 'analysis':
        reportObservable = this.reportService.getPurchaseAnalysis(params);
        break;
      case 'gst-input':
        reportObservable = this.reportService.getGSTInputSummary(params);
        break;
      case 'supplier-aging':
        reportObservable = this.reportService.getSupplierAging();
        break;
      case 'payment-due':
        reportObservable = this.reportService.getPaymentDue();
        break;
      case 'vs-sales':
        reportObservable = this.reportService.getPurchaseVsSales(params);
        break;
      default:
        reportObservable = this.reportService.getPurchaseSummary(params);
    }

    reportObservable.subscribe({
      next: (response) => {
        this.reportData = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error generating report:', error);
        this.snackBar.open('Failed to generate report', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  exportReport(format: 'excel' | 'pdf'): void {
    const params = {
      reportType: this.selectedReport,
      dateFrom: this.dateRangeForm.get('dateFrom')?.value,
      dateTo: this.dateRangeForm.get('dateTo')?.value,
      format
    };

    this.reportService.exportReport(params).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `purchase-report-${this.selectedReport}-${new Date().getTime()}.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Report exported successfully', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error exporting report:', error);
        this.snackBar.open('Failed to export report', 'Close', { duration: 3000 });
      }
    });
  }

  getGSTBreakdown(): { gst18: number; gst4: number; total: number } {
    if (!this.reportData) {
      return { gst18: 0, gst4: 0, total: 0 };
    }

    const gst18 = this.reportData.gst18Total || this.reportData.totalGST18 || 0;
    const gst4 = this.reportData.gst4Total || this.reportData.totalGST4 || 0;
    
    return {
      gst18,
      gst4,
      total: gst18 + gst4
    };
  }
}
