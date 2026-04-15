import { Component, Inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { Customer } from '../../../../../core/services/pos.service';

export interface PaymentData {
    totalAmount: number;
    customer: Customer;
}

export interface PaymentResult {
    isCredit: boolean;
    payment?: {
        mode: 'cash' | 'card';
        amount: number;
        tendered: number;
        change: number;
    };
}

@Component({
    selector: 'app-payment-modal',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonToggleModule,
        MatIconModule,
        FormsModule,
        A11yModule
    ],
    templateUrl: './payment-modal.component.html',
    styleUrls: ['./payment-modal.component.scss']
})
export class PaymentModalComponent {
    // Signals for reactive state
    paymentMode = signal<'cash' | 'card'>('cash');
    amountTendered = signal<number>(0);
    isCreditSale = signal<boolean>(false);

    // Computed values
    changeDue = computed(() => {
        return Math.max(0, this.amountTendered() - this.data.totalAmount);
    });

    isValid = computed(() => {
        if (this.isCreditSale()) return true;
        return this.amountTendered() >= this.data.totalAmount;
    });

    constructor(
        public dialogRef: MatDialogRef<PaymentModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: PaymentData
    ) {
        // Initialize tendered amount to total amount for convenience
        this.amountTendered.set(data.totalAmount);

        // If walk-in customer, force Pay Now (disable credit switch logic in UI)
        if (this.isWalkIn) {
            this.isCreditSale.set(false);
        }
    }

    get isWalkIn(): boolean {
        return this.data.customer.code === 'CUST-WALKIN' || this.data.customer.type === 'retail';
    }

    setPaymentMode(mode: 'cash' | 'card') {
        this.paymentMode.set(mode);
        this.isCreditSale.set(false);
        // Reset tendered to total if it was 0 or less
        if (this.amountTendered() < this.data.totalAmount) {
            this.amountTendered.set(this.data.totalAmount);
        }
    }

    enableCreditSale() {
        this.isCreditSale.set(true);
    }

    onQuickTender(amount: number) {
        this.amountTendered.set(amount);
    }

    submit() {
        if (!this.isValid()) return;

        const result: PaymentResult = {
            isCredit: this.isCreditSale()
        };

        if (!this.isCreditSale()) {
            result.payment = {
                mode: this.paymentMode(),
                amount: this.data.totalAmount, // We record the exact bill amount as paid
                tendered: this.amountTendered(), // Store tendered for reference if needed
                change: this.changeDue()
            };
        }

        this.dialogRef.close(result);
    }

    close() {
        this.dialogRef.close();
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            maximumFractionDigits: 0
        }).format(amount);
    }
}
