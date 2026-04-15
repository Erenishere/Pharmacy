import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InvoiceService } from '../../services/invoice.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

@Component({
    selector: 'app-sales-return',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatOptionModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatSnackBarModule,
        MatCheckboxModule,
        MatChipsModule,
        MatDividerModule,
        MatBadgeModule,
        MatPaginatorModule,
        MatSortModule
    ],
    templateUrl: './sales-return.component.html',
    styleUrls: ['./sales-return.component.scss']
})
export class SalesReturnComponent implements OnInit {
    // Search & selection
    searchQuery = '';
    searchResults: any[] = [];
    selectedInvoice: any = null;
    searching = false;

    // Return form
    returnForm: FormGroup;
    submitting = false;
    processing = false;

    // View state: 'list' | 'search' | 'create' | 'success'
    viewState: 'list' | 'search' | 'create' | 'success' = 'list';

    // Created return data
    createdReturn: any = null;

    // List view data
    returnsList: any[] = [];
    totalReturns = 0;
    pageSize = 10;
    pageIndex = 0;
    returnsTableColumns: string[] = ['invoiceNumber', 'date', 'customer', 'amount', 'status', 'actions'];

    // Analytics & Statistics
    returnsAnalytics = {
        totalReturns: 0,
        totalCreditAmount: 0,
        returnsByReason: {} as Record<string, number>,
        monthlyReturns: [] as any[],
        topReturnItems: [] as any[]
    };

    // Return items table
    displayedColumns: string[] = [
        'select', 'itemName', 'batchNumber', 'originalQty', 'returnQty', 'unitPrice', 'lineTotal'
    ];

    // Return reasons
    returnReasons = [
        { value: 'damaged', label: 'Damaged / Broken' },
        { value: 'expired', label: 'Expired' },
        { value: 'wrong_item', label: 'Wrong Item Delivered' },
        { value: 'quality_issue', label: 'Quality Issue' },
        { value: 'other', label: 'Other' }
    ];

    constructor(
        private fb: FormBuilder,
        private invoiceService: InvoiceService,
        public router: Router,
        private snackBar: MatSnackBar
    ) {
        this.returnForm = this.fb.group({
            returnReason: ['damaged', Validators.required],
            returnNotes: [''],
            items: this.fb.array([])
        });
    }

    ngOnInit(): void {
        // Check for pre-selected invoice from query params
        const urlParams = new URLSearchParams(window.location.search);
        const preSelectedId = urlParams.get('invoiceId');
        if (preSelectedId) {
            this.invoiceService.getSalesInvoiceById(preSelectedId).subscribe({
                next: (response) => {
                    if (response.success && response.data) {
                        this.selectInvoice(response.data);
                    }
                },
                error: (err) => console.error('Error pre-loading invoice:', err)
            });
        } else {
            this.loadReturns();
        }
    }

    get itemsArray(): FormArray {
        return this.returnForm.get('items') as FormArray;
    }

    // ─── Invoice Search ──────────────────────────────────────────────
    searchInvoices(): void {
        if (!this.searchQuery || this.searchQuery.trim().length < 2) {
            this.snackBar.open('Enter at least 2 characters to search', 'Close', { duration: 3000 });
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
                    this.snackBar.open('No confirmed invoices found', 'Close', { duration: 3000 });
                }
            },
            error: (err) => {
                console.error('Search error:', err);
                this.snackBar.open('Error searching invoices', 'Close', { duration: 3000 });
                this.searching = false;
            }
        });
    }

    onSearchKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.searchInvoices();
        }
    }

    selectInvoice(invoice: any): void {
        this.searching = true;
        this.invoiceService.getSalesInvoiceById(invoice._id).subscribe({
            next: (response) => {
                this.selectedInvoice = response.data;
                this.populateReturnItems();
                this.viewState = 'create';
                this.searching = false;
            },
            error: (err) => {
                console.error('Error loading invoice:', err);
                this.snackBar.open('Failed to load invoice details', 'Close', { duration: 3000 });
                this.searching = false;
            }
        });
    }

    // ─── Return Items Management ─────────────────────────────────────
    populateReturnItems(): void {
        this.itemsArray.clear();
        if (!this.selectedInvoice) return;

        const items = this.selectedInvoice.items || [];
        items.forEach((item: any) => {
            const itemId = item.itemId?._id || item.itemId;
            const name = item.itemName || item.itemId?.name || 'Unknown';
            const code = item.itemCode || item.itemId?.code || '';
            const batch = item.batchNumber || '';
            const originalQty = item.totalUnitQty || item.quantity || 0;
            const unitPrice = item.unitPrice || 0;

            this.itemsArray.push(this.fb.group({
                selected: [false],
                itemId: [itemId],
                itemName: [name],
                itemCode: [code],
                batchNumber: [batch],
                originalQuantity: [originalQty],
                returnQuantity: [0, [Validators.required, Validators.min(0)]],
                unitPrice: [unitPrice],
                warehouseId: [item.warehouseId]
            }));
        });
    }

    toggleItem(index: number): void {
        const item = this.itemsArray.at(index);
        const selected = item.get('selected')?.value;
        if (!selected) {
            item.get('returnQuantity')?.setValue(0);
        } else {
            item.get('returnQuantity')?.setValue(item.get('originalQuantity')?.value || 0);
        }
    }

    selectAllItems(checked: boolean): void {
        for (let i = 0; i < this.itemsArray.length; i++) {
            const item = this.itemsArray.at(i);
            item.get('selected')?.setValue(checked);
            if (checked) {
                item.get('returnQuantity')?.setValue(item.get('originalQuantity')?.value || 0);
            } else {
                item.get('returnQuantity')?.setValue(0);
            }
        }
    }

    get allSelected(): boolean {
        return this.itemsArray.length > 0 && this.itemsArray.controls.every(c => c.get('selected')?.value);
    }

    get someSelected(): boolean {
        return this.itemsArray.controls.some(c => c.get('selected')?.value) && !this.allSelected;
    }

    get selectedItemCount(): number {
        return this.itemsArray.controls.filter(c => c.get('selected')?.value).length;
    }

    calculateLineTotal(index: number): number {
        const item = this.itemsArray.at(index);
        const qty = item.get('returnQuantity')?.value || 0;
        const price = item.get('unitPrice')?.value || 0;
        return qty * price;
    }

    calculateReturnTotal(): number {
        let total = 0;
        for (let i = 0; i < this.itemsArray.length; i++) {
            const item = this.itemsArray.at(i);
            if (item.get('selected')?.value) {
                total += this.calculateLineTotal(i);
            }
        }
        return total;
    }

    // ─── Form Submission ─────────────────────────────────────────────
    onSubmit(): void {
        const selectedItems = this.itemsArray.controls
            .filter(c => c.get('selected')?.value && (c.get('returnQuantity')?.value || 0) > 0)
            .map(c => ({
                itemId: c.get('itemId')?.value,
                returnQuantity: c.get('returnQuantity')?.value,
                batchNumber: c.get('batchNumber')?.value,
                warehouseId: c.get('warehouseId')?.value
            }));

        if (selectedItems.length === 0) {
            this.snackBar.open('Select at least one item with a return quantity', 'Close', { duration: 4000 });
            return;
        }

        // Validate quantities
        for (const ctrl of this.itemsArray.controls) {
            if (!ctrl.get('selected')?.value) continue;
            const rq = ctrl.get('returnQuantity')?.value || 0;
            const oq = ctrl.get('originalQuantity')?.value || 0;
            if (rq > oq) {
                this.snackBar.open(
                    `Return qty cannot exceed original qty for ${ctrl.get('itemName')?.value}`,
                    'Close', { duration: 5000 }
                );
                return;
            }
        }

        const payload = {
            originalInvoiceId: this.selectedInvoice._id,
            returnItems: selectedItems,
            returnReason: this.returnForm.get('returnReason')?.value,
            returnNotes: this.returnForm.get('returnNotes')?.value
        };

        this.submitting = true;
        this.invoiceService.createSalesReturn(payload).subscribe({
            next: (response) => {
                this.createdReturn = response.data;
                this.submitting = false;
                this.snackBar.open('Sales return created as draft!', 'Close', { duration: 4000 });
                // Auto-process the return
                this.processReturn(this.createdReturn._id);
            },
            error: (err) => {
                console.error('Return creation error:', err);
                const serverMsg = err.error?.error?.message || err.error?.message;
                this.snackBar.open(
                    serverMsg || 'Failed to create sales return',
                    'Close', { duration: 6000 }
                );
                this.submitting = false;
            }
        });
    }

    processReturn(returnId: string): void {
        this.processing = true;
        this.invoiceService.processReturn(returnId).subscribe({
            next: (response) => {
                this.createdReturn = response.data;
                this.processing = false;
                this.viewState = 'success';
                this.snackBar.open('Return processed — stock restored & balance adjusted!', 'Close', { duration: 5000 });
            },
            error: (err) => {
                console.error('Process error:', err);
                this.processing = false;
                this.viewState = 'success'; // Still show the draft return
                const serverMsg = err.error?.error?.message || err.error?.message;
                this.snackBar.open(
                    serverMsg || 'Return created but auto-processing failed. You can process it later.',
                    'Close', { duration: 6000 }
                );
            }
        });
    }

    // ─── Navigation helpers ──────────────────────────────────────────
    goBack(): void {
        if (this.viewState === 'search') {
            this.viewState = 'list';
        } else if (this.viewState === 'create') {
            this.viewState = 'search';
        } else {
            this.viewState = 'list';
        }
        this.selectedInvoice = null;
        this.createdReturn = null;
        this.itemsArray.clear();
        this.returnForm.reset({ returnReason: 'damaged', returnNotes: '' });
    }

    startNewReturn(): void {
        this.viewState = 'search';
        this.searchQuery = '';
        this.searchResults = [];
        this.selectedInvoice = null;
        this.createdReturn = null;
        this.itemsArray.clear();
        this.returnForm.reset({ returnReason: 'damaged', returnNotes: '' });
    }

    getInvoiceDate(invoice: any): string {
        return invoice?.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '-';
    }

    getCustomerName(invoice: any): string {
        return invoice?.customerId?.name || invoice?.customerName || '-';
    }

    getTotal(invoice: any): number {
        return invoice?.totals?.netBillTotal || invoice?.totals?.grandTotal || 0;
    }

    loadReturns(): void {
        this.processing = true;
        this.invoiceService.getSalesReturns({
            page: this.pageIndex + 1,
            limit: this.pageSize
        }).subscribe({
            next: (response) => {
                this.returnsList = response.data || [];
                this.totalReturns = response.pagination?.totalItems || this.returnsList.length;
                this.calculateAnalytics(this.returnsList);
                this.processing = false;
                if (this.viewState !== 'create' && this.viewState !== 'search') {
                    this.viewState = 'list';
                }
            },
            error: (err) => {
                console.error('Error loading returns:', err);
                this.processing = false;
                this.snackBar.open('Failed to load past returns', 'Close', { duration: 3000 });
            }
        });
    }

    calculateAnalytics(returns: any[]): void {
        this.returnsAnalytics = {
            totalReturns: returns.length,
            totalCreditAmount: returns.reduce((sum, ret) => sum + (ret.totals?.netBillTotal ? -ret.totals.netBillTotal : 0), 0),
            returnsByReason: {},
            monthlyReturns: [],
            topReturnItems: []
        };

        // Calculate returns by reason
        returns.forEach(ret => {
            const reason = ret.returnReason || 'other';
            this.returnsAnalytics.returnsByReason[reason] = (this.returnsAnalytics.returnsByReason[reason] || 0) + 1;
        });

        // Calculate monthly returns (last 6 months)
        const monthlyData: { [key: string]: number } = {};
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = date.toISOString().substring(0, 7); // YYYY-MM format
            last6Months.push(monthKey);
            monthlyData[monthKey] = 0;
        }

        returns.forEach(ret => {
            const returnDate = new Date(ret.createdAt);
            const monthKey = returnDate.toISOString().substring(0, 7);
            if (monthlyData.hasOwnProperty(monthKey)) {
                monthlyData[monthKey] += 1;
            }
        });

        this.returnsAnalytics.monthlyReturns = last6Months.map(month => ({
            month: month,
            count: monthlyData[month]
        }));

        // Calculate top return items
        const itemCounts: { [key: string]: any } = {};
        returns.forEach(ret => {
            ret.items?.forEach((item: any) => {
                const itemId = item.itemId;
                if (!itemCounts[itemId]) {
                    itemCounts[itemId] = {
                        itemId: itemId,
                        itemName: item.itemName || 'Unknown',
                        returnCount: 0,
                        totalQuantity: 0
                    };
                }
                itemCounts[itemId].returnCount += 1;
                itemCounts[itemId].totalQuantity += item.returnQuantity || 0;
            });
        });

        this.returnsAnalytics.topReturnItems = Object.values(itemCounts)
            .sort((a: any, b: any) => b.returnCount - a.returnCount)
            .slice(0, 10);
    }

    onPageChange(event: PageEvent): void {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
        this.loadReturns();
    }

    viewReturnDetails(returnInvoice: any): void {
        this.createdReturn = returnInvoice;
        this.viewState = 'success'; // Reuse success view for details
    }

    backToList(): void {
        this.viewState = 'list';
        this.selectedInvoice = null;
        this.createdReturn = null;
        this.loadReturns();
    }
}
