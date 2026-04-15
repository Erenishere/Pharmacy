import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { Customer } from '../../../../core/models/customer.model';

@Component({
    selector: 'app-customer-detail-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatDividerModule
    ],
    template: `
        <div class="customer-detail-dialog">
            <div class="dialog-header">
                <h2 mat-dialog-title>
                    <mat-icon>analytics</mat-icon>
                    Customer Insight
                </h2>
                <button mat-icon-button (click)="close()">
                    <mat-icon>close</mat-icon>
                </button>
            </div>

            <mat-dialog-content>
                <div class="customer-detail-content">
                    <!-- Premium Header Section -->
                    <div class="customer-avatar-section">
                        <div class="avatar-circle">
                            <mat-icon>account_balance</mat-icon>
                        </div>
                        <h3 class="customer-name">{{ customer.name }}</h3>
                        <span class="customer-code">{{ customer.code }}</span>
                    </div>

                    <mat-divider></mat-divider>

                    <div class="info-grid">
                        <!-- Identity Section -->
                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>fingerprint</mat-icon>
                                <span>Unique Identifier</span>
                            </div>
                            <div class="info-value customer-id">{{ customer._id }}</div>
                        </div>

                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>category</mat-icon>
                                <span>Business Classification</span>
                            </div>
                            <div class="info-value">
                                <mat-chip class="type-chip">{{ customer.type | titlecase }}</mat-chip>
                            </div>
                        </div>

                        <!-- Contact Matrix -->
                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>phone_iphone</mat-icon>
                                <span>Primary Communication</span>
                            </div>
                            <div class="info-value">{{ customer.phone || 'No direct line' }}</div>
                        </div>

                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>alternate_email</mat-icon>
                                <span>Digital Correspondence</span>
                            </div>
                            <div class="info-value">{{ customer.email || 'No email recorded' }}</div>
                        </div>

                        <div class="info-item" style="grid-column: span 2;">
                            <div class="info-label">
                                <mat-icon>location_on</mat-icon>
                                <span>Physical Headquarters</span>
                            </div>
                            <div class="info-value">{{ customer.address || 'Address not registered' }}</div>
                        </div>

                        <!-- Financial Position -->
                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>trending_up</mat-icon>
                                <span>Credit Threshold</span>
                            </div>
                            <div class="info-value">{{ (customer.creditLimit | currency) || 'No limit set' }}</div>
                        </div>

                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>account_balance_wallet</mat-icon>
                                <span>Outstanding Exposure</span>
                            </div>
                            <div class="info-value">{{ (customer.currentBalance | currency) || '$0.00' }}</div>
                        </div>

                        <!-- System Meta -->
                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>verified_user</mat-icon>
                                <span>Authorization Status</span>
                            </div>
                            <div class="info-value">
                                <mat-chip [class.active-chip]="customer.isActive" [class.inactive-chip]="!customer.isActive">
                                    {{ customer.isActive ? 'Active' : 'Deactivated' }}
                                </mat-chip>
                            </div>
                        </div>

                        <div class="info-item">
                            <div class="info-label">
                                <mat-icon>calendar_today</mat-icon>
                                <span>Record Established</span>
                            </div>
                            <div class="info-value">{{ formatDate(customer.createdAt) }}</div>
                        </div>
                    </div>
                </div>
            </mat-dialog-content>

            <mat-dialog-actions align="end">
                <button mat-raised-button (click)="close()">
                    <mat-icon>check_circle</mat-icon>
                    Acknowledge
                </button>
            </mat-dialog-actions>
        </div>
    `,
    styleUrl: './customer-detail-dialog.component.scss'
})
export class CustomerDetailDialogComponent {
    constructor(
        private dialogRef: MatDialogRef<CustomerDetailDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public customer: Customer
    ) { }

    close(): void {
        this.dialogRef.close();
    }

    formatDate(date: string | undefined): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString();
    }
}