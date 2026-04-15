import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { InvestorService, Investor } from '../../services/investor.service';
import { InvestorFormDialogComponent } from '../investor-form-dialog/investor-form-dialog.component';

@Component({
  selector: 'app-investor-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, MatCardModule, MatIconModule,
    MatButtonModule, MatTableModule, MatProgressSpinnerModule,
    MatDialogModule, MatSnackBarModule, MatMenuModule
  ],
  templateUrl: './investor-list.component.html',
  styleUrl: './investor-list.component.scss'
})
export class InvestorListComponent implements OnInit {
  loading = false;
  investors: Investor[] = [];
  displayedColumns = ['code', 'name', 'contactPerson', 'balance', 'status', 'actions'];

  summary = {
    totalInvestors: 0,
    activeInvestors: 0,
    totalInvestment: 0
  };

  constructor(
    private investorService: InvestorService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadInvestors();
  }

  loadInvestors(): void {
    this.loading = true;
    this.investorService.getAllInvestors().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.investors = response.data;
          this.calculateSummary();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showMessage('Failed to load investors', 'error');
      }
    });
  }

  calculateSummary(): void {
    this.summary = {
      totalInvestors: this.investors.length,
      activeInvestors: this.investors.filter(i => i.isActive).length,
      totalInvestment: this.investors.reduce((sum, i) => sum + (i.balance || 0), 0)
    };
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(InvestorFormDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'investor-form-dialog-panel',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInvestors();
      }
    });
  }

  openEditDialog(investor: Investor): void {
    const dialogRef = this.dialog.open(InvestorFormDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: 'investor-form-dialog-panel',
      data: { mode: 'edit', investor }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadInvestors();
      }
    });
  }

  deleteInvestor(investor: Investor): void {
    if (confirm(`Are you sure you want to delete investor "${investor.name}"?`)) {
      this.investorService.deleteInvestor(investor._id).subscribe({
        next: (response) => {
          if (response.success) {
            this.showMessage('Investor deleted successfully', 'success');
            this.loadInvestors();
          }
        },
        error: () => {
          this.showMessage('Failed to delete investor', 'error');
        }
      });
    }
  }

  showMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: type === 'success' ? 'snackbar-success' : 'snackbar-error'
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(value || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('en-PK').format(value || 0);
  }
}
