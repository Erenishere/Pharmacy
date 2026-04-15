import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { AccountMasterService, Account } from '../../services/account-master.service';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'app-account-master-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTableModule],
  template: `
    <div class="account-master-container">
      <div class="page-header">
        <h1><mat-icon>account_circle</mat-icon> Account Master Management</h1>
        <p>Manage customer, supplier, employee, and investor accounts</p>
      </div>
      <mat-card>
        <mat-card-content>
          <p>Account management interface - To be fully implemented</p>
          <button mat-raised-button color="primary" (click)="loadAccounts()">
            <mat-icon>refresh</mat-icon> Load Accounts
          </button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`.account-master-container { padding: 20px; } .page-header h1 { display: flex; align-items: center; gap: 12px; }`]
})
export class AccountMasterListComponent implements OnInit {
  accounts: Account[] = [];

  constructor(
    private accountService: AccountMasterService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadAccounts();
  }

  loadAccounts() {
    this.accountService.getAccounts().subscribe({
      next: (response) => {
        if (response.success) {
          this.accounts = response.data;
          this.toastService.success(`Loaded ${this.accounts.length} accounts`);
        }
      },
      error: (err) => this.toastService.error('Failed to load accounts')
    });
  }
}
