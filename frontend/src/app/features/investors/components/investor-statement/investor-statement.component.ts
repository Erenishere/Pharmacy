import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InvestorService, InvestorStatement } from '../../services/investor.service';
import { ExportButtonsComponent } from '@shared/components/export-buttons/export-buttons.component';
import { PrintPreviewService } from '@core/services/print-preview.service';

@Component({
  selector: 'app-investor-statement',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule,
    ExportButtonsComponent
  ],
  templateUrl: './investor-statement.component.html',
  styleUrl: './investor-statement.component.scss'
})
export class InvestorStatementComponent implements OnInit {
  loading = false;
  investorId: string = '';
  statementData: InvestorStatement | null = null;
  startDate: Date | null = null;
  endDate: Date | null = null;

  constructor(
    private route: ActivatedRoute,
    private investorService: InvestorService,
    private printPreviewService: PrintPreviewService
  ) {
    const today = new Date();
    this.endDate = today;
    this.startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.investorId = params['id'];
      this.loadStatement();
    });
  }

  loadStatement(): void {
    if (!this.investorId || !this.startDate || !this.endDate) return;

    this.loading = true;
    const startDateStr = this.startDate.toISOString().split('T')[0];
    const endDateStr = this.endDate.toISOString().split('T')[0];

    this.investorService.getInvestorStatement(this.investorId, startDateStr, endDateStr).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.statementData = response.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadStatement();
  }

  printStatement(): void {
    this.printPreviewService.openPreviewFromElement('investor-statement-content', 'Investor Statement');
  }

  exportToPDF(): void {
    // Deprecated - now handled by ExportButtonsComponent
    this.printStatement();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Export functionality
  get exportData(): any[] {
    if (!this.statementData || !this.statementData.transactions) return [];
    
    return this.statementData.transactions.map(txn => ({
      'Date': this.formatDate(txn.date),
      'Type': txn.type,
      'Description': txn.description || '',
      'Debit': txn.type === 'Investment' ? this.formatCurrency(txn.amount) : '',
      'Credit': txn.type === 'Withdrawal' || txn.type === 'Profit' ? this.formatCurrency(txn.amount) : '',
      'Balance': this.formatCurrency(txn.balance || 0)
    }));
  }

  get exportColumns(): string[] {
    return ['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance'];
  }

  showPrintPreview(): void {
    this.printPreviewService.openPreviewFromElement('investor-statement-content', 'Investor Statement');
  }
}
