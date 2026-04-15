import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InvoiceService } from '../../../invoices/services/invoice.service';
import { PosService } from '../../../../core/services/pos.service';
import { ToastService } from '../../../../shared/services/toast.service';

interface ReturnItem {
    selected: boolean;
    itemId: string;
    itemName: string;
    itemCode: string;
    batchNumber: string;
    originalQuantity: number;
    returnQuantity: number;
    unitPrice: number;
    warehouseId: string;
}

@Component({
    selector: 'app-salesman-sales-return',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatDividerModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './sales-return.component.html',
    styleUrls: ['./sales-return.component.scss']
})
export class SalesmanSalesReturnComponent {
    viewState: 'search' | 'create' | 'submitting' | 'success' = 'search';

    // Search
    searchQuery = '';
    searchResults: any[] = [];
    searching = false;

    // Selected invoice & return items
    selectedInvoice: any = null;
    returnItems: ReturnItem[] = [];
    returnReason = 'damaged';
    returnNotes = '';

    // Result
    createdReturn: any = null;

    returnReasons = [
        { value: 'damaged', label: 'Damaged / Broken' },
        { value: 'expired', label: 'Expired' },
        { value: 'wrong_item', label: 'Wrong Item Delivered' },
        { value: 'quality_issue', label: 'Quality Issue' },
        { value: 'other', label: 'Other' }
    ];

    constructor(
        private invoiceService: InvoiceService,
        private posService: PosService,
        private toastService: ToastService
    ) {}

    // ─── Search ──────────────────────────────────────────────────────
    searchInvoices(): void {
        if (!this.searchQuery || this.searchQuery.trim().length < 2) {
            this.toastService.warning('Enter at least 2 characters to search');
            return;
        }

        this.searching = true;
        this.searchResults = [];

        this.invoiceService.getSalesInvoices({
            keyword: this.searchQuery.trim(),
            status: 'confirmed',
            limit: 20
        }).subscribe({
            next: (response) => {
                this.searchResults = (response.data || []).filter(
                    (inv: any) => inv.type === 'sales' && inv.status === 'confirmed'
                );
                this.searching = false;
                if (this.searchResults.length === 0) {
                    this.toastService.info('No confirmed invoices found');
                }
            },
            error: () => {
                this.toastService.error('Error searching invoices');
                this.searching = false;
            }
        });
    }

    onSearchKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.searchInvoices();
        }
    }

    // ─── Select Invoice ──────────────────────────────────────────────
    selectInvoice(invoice: any): void {
        this.searching = true;
        this.invoiceService.getSalesInvoiceById(invoice._id).subscribe({
            next: (response) => {
                this.selectedInvoice = response.data;
                this.populateReturnItems();
                this.viewState = 'create';
                this.searching = false;
            },
            error: () => {
                this.toastService.error('Failed to load invoice details');
                this.searching = false;
            }
        });
    }

    // ─── Populate Items ──────────────────────────────────────────────
    populateReturnItems(): void {
        this.returnItems = [];
        if (!this.selectedInvoice) return;

        const items = this.selectedInvoice.items || [];
        items.forEach((item: any) => {
            this.returnItems.push({
                selected: false,
                itemId: item.itemId?._id || item.itemId,
                itemName: item.itemName || item.itemId?.name || 'Unknown',
                itemCode: item.itemCode || item.itemId?.code || '',
                batchNumber: item.batchNumber || '',
                originalQuantity: item.totalUnitQty || item.quantity || 0,
                returnQuantity: 0,
                unitPrice: item.unitPrice || 0,
                warehouseId: item.warehouseId
            });
        });
    }

    // ─── Item Selection ──────────────────────────────────────────────
    toggleItem(item: ReturnItem): void {
        if (item.selected) {
            item.returnQuantity = item.originalQuantity;
        } else {
            item.returnQuantity = 0;
        }
    }

    toggleAll(checked: boolean): void {
        this.returnItems.forEach(item => {
            item.selected = checked;
            item.returnQuantity = checked ? item.originalQuantity : 0;
        });
    }

    get allSelected(): boolean {
        return this.returnItems.length > 0 && this.returnItems.every(i => i.selected);
    }

    get someSelected(): boolean {
        return this.returnItems.some(i => i.selected) && !this.allSelected;
    }

    get selectedCount(): number {
        return this.returnItems.filter(i => i.selected).length;
    }

    // ─── Calculations ────────────────────────────────────────────────
    lineTotal(item: ReturnItem): number {
        return (item.returnQuantity || 0) * (item.unitPrice || 0);
    }

    get returnTotal(): number {
        return this.returnItems
            .filter(i => i.selected)
            .reduce((sum, i) => sum + this.lineTotal(i), 0);
    }

    // ─── Helpers ─────────────────────────────────────────────────────
    getCustomerName(invoice: any): string {
        return invoice?.customerId?.name || invoice?.customerName || '-';
    }

    getInvoiceDate(invoice: any): string {
        return invoice?.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-';
    }

    getTotal(invoice: any): number {
        return invoice?.totals?.netBillTotal || invoice?.totals?.grandTotal || 0;
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    // ─── Submit ──────────────────────────────────────────────────────
    onSubmit(): void {
        const selectedItems = this.returnItems
            .filter(i => i.selected && (i.returnQuantity || 0) > 0)
            .map(i => ({
                itemId: i.itemId,
                quantity: i.returnQuantity,
                batchNumber: i.batchNumber
            }));

        if (selectedItems.length === 0) {
            this.toastService.warning('Select at least one item with a return quantity');
            return;
        }

        // Validate quantities
        for (const item of this.returnItems) {
            if (!item.selected) continue;
            if (item.returnQuantity > item.originalQuantity) {
                this.toastService.error(`Return qty cannot exceed original qty for ${item.itemName}`);
                return;
            }
            if (item.returnQuantity <= 0) {
                this.toastService.error(`Return qty must be greater than 0 for ${item.itemName}`);
                return;
            }
        }

        const payload = {
            originalInvoiceId: this.selectedInvoice._id,
            returnItems: selectedItems,
            returnReason: this.returnReason,
            returnNotes: this.returnNotes
        };

        this.viewState = 'submitting';

        // Use POS return endpoint which auto-processes (create + confirm in one step)
        this.posService.createReturn(payload).subscribe({
            next: (response) => {
                this.createdReturn = response.data;
                this.viewState = 'success';
                this.toastService.success('Return processed — stock restored & customer credited!');
            },
            error: (err) => {
                console.error('Sales return error full response:', JSON.stringify(err.error));
                const errBody = err.error?.error || err.error;
                const serverMsg = errBody?.message;
                const details = errBody?.details;

                if (details && Array.isArray(details)) {
                    details.forEach((d: any) =>
                        this.toastService.error(`${d.field}: ${d.message}`)
                    );
                } else if (serverMsg) {
                    const lines = serverMsg.split('\n').filter((l: string) => l.trim());
                    lines.forEach((line: string) => this.toastService.error(line));
                } else {
                    this.toastService.error('Failed to create sales return');
                }
                this.viewState = 'create';
            }
        });
    }

    // ─── Navigation ──────────────────────────────────────────────────
    goBack(): void {
        if (this.viewState === 'create') {
            this.viewState = 'search';
            this.selectedInvoice = null;
            this.returnItems = [];
            this.returnReason = 'damaged';
            this.returnNotes = '';
        }
    }

    startNewReturn(): void {
        this.viewState = 'search';
        this.searchQuery = '';
        this.searchResults = [];
        this.selectedInvoice = null;
        this.returnItems = [];
        this.returnReason = 'damaged';
        this.returnNotes = '';
        this.createdReturn = null;
    }
}
