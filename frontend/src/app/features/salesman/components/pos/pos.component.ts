import { Component, OnInit, signal, computed, ViewChild, ElementRef, AfterViewInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, finalize, startWith, filter, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PosService, Customer, Item } from '../../../../core/services/pos.service';
import { SalesmanService, Salesman } from '../../../../core/services/salesman.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PaymentModalComponent, PaymentResult } from './payment-modal/payment-modal.component';
import { MatBadgeModule } from '@angular/material/badge';

interface CartItem extends Item {
    quantity: number;
    discount: number;
    taxAmount: number;
    lineTotal: number;
    selectedBatch?: string;     // Batch Number
    selectedExpiry?: string;    // Expiry Date
}

@Component({
    selector: 'app-pos',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatAutocompleteModule,
        MatSelectModule,
        MatTableModule,
        MatDividerModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        MatDialogModule,
        MatBadgeModule,
        FormsModule,
        ReactiveFormsModule
    ],
    templateUrl: './pos.component.html',
    styleUrl: './pos.component.scss'
})
export class PosComponent implements OnInit, AfterViewInit {
    @ViewChild('productInput') productInput!: ElementRef;

    customerControl = new FormControl();
    itemSearchControl = new FormControl();

    customers: Customer[] = [];
    searchItems: Item[] = [];
    selectedCustomer: Customer | null = null;
    currentSalesman: Salesman | null = null;

    // Customer type: 'walkin' or 'registered'
    customerType: 'walkin' | 'registered' = 'walkin';

    private readonly CART_STORAGE_KEY = 'pos_cart';
    private readonly CUSTOMER_STORAGE_KEY = 'pos_customer';

    cart = signal<CartItem[]>([]);

    totals = computed(() => {
        const items = this.cart();
        const customer = this.selectedCustomer;

        return this.posService.calculateTotals(
            items.map(i => ({
                quantity: i.quantity,
                unitPrice: i.salePrice,
                discount: i.discount,
                gstRate: i.tax?.gstRate,
                advanceTaxRate: 0 // Set to 0 for POS by default, or map if available
            })),
            { isNonFiler: customer?.isNonFiler || customer?.taxStatus === 'non-filer' }
        );
    });

    isSearchingCustomers = false;
    isSearchingItems = false;
    isSubmitting = false;

    // Invoice state
    currentInvoiceId: string | null = null;
    showReceipt = false;
    hasProcessedInvoice = false;
    today = new Date();

    // Held bills state
    showHeldBills = false;
    heldInvoices: any[] = [];
    isLoadingHeld = false;

    constructor(
        private posService: PosService,
        private salesmanService: SalesmanService,
        private toastService: ToastService,
        private dialog: MatDialog
    ) { }

    loadHeldInvoices(): void {
        this.isLoadingHeld = true;
        this.posService.getHeldInvoices().subscribe({
            next: (response) => {
                if (response.success) {
                    this.heldInvoices = response.data;
                }
                this.isLoadingHeld = false;
            },
            error: (err) => {
                console.error('Error loading held invoices:', err);
                this.isLoadingHeld = false;
                this.toastService.error('Failed to load held invoices');
            }
        });
    }

    recallBill(invoice: any): void {
        this.posService.recallInvoice(invoice._id).subscribe({
            next: (response) => {
                if (response.success) {
                    const recalledInvoice = response.data;
                    // Load into cart
                    const cartItems: CartItem[] = recalledInvoice.items.map((item: any) => ({
                        itemId: item.itemId._id,
                        code: item.itemId.code,
                        name: item.itemId.name,
                        quantity: item.unitQuantity,
                        salePrice: item.unitRate,
                        discount: item.discount1Percent || 0,
                        total: item.lineTotal,
                        tax: { gstRate: item.gstRate || 0 }
                    }));

                    this.cart.set(cartItems);
                    this.selectedCustomer = recalledInvoice.customerId;
                    this.customerControl.setValue(recalledInvoice.customerId.name);
                    this.currentInvoiceId = recalledInvoice._id;
                    this.showHeldBills = false;
                    this.toastService.success(`Recalled bill ${recalledInvoice.invoiceNumber}`);
                }
            },
            error: (err) => {
                console.error('Error recalling invoice:', err);
                this.toastService.error('Failed to recall invoice');
            }
        });
    }

    ngOnInit(): void {
        this.loadSalesmanProfile();
        this.setupSearch();
        this.restoreFromStorage(); // Restore cart & customer first

        // If no customer restored, or if it's a walk-in, load/refresh the default walk-in customer
        // This prevents stale customer IDs in localStorage from causing 404s
        if (!this.selectedCustomer || this.selectedCustomer.code === 'CUST-WALKIN') {
            this.customerType = 'walkin';
            this.loadDefaultCustomer();
        } else {
            this.customerType = 'registered';
        }
    }

    // Persist cart to localStorage whenever it changes
    private saveCartToStorage(): void {
        try {
            localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(this.cart()));
        } catch (e) {
            console.warn('Failed to save cart to localStorage', e);
        }
    }

    private saveCustomerToStorage(): void {
        try {
            if (this.selectedCustomer) {
                localStorage.setItem(this.CUSTOMER_STORAGE_KEY, JSON.stringify(this.selectedCustomer));
            } else {
                localStorage.removeItem(this.CUSTOMER_STORAGE_KEY);
            }
        } catch (e) {
            console.warn('Failed to save customer to localStorage', e);
        }
    }

    private restoreFromStorage(): void {
        try {
            // Restore cart
            const savedCart = localStorage.getItem(this.CART_STORAGE_KEY);
            if (savedCart) {
                const parsedCart = JSON.parse(savedCart) as CartItem[];
                if (Array.isArray(parsedCart) && parsedCart.length > 0) {
                    this.cart.set(parsedCart);
                }
            }

            // Restore customer
            const savedCustomer = localStorage.getItem(this.CUSTOMER_STORAGE_KEY);
            if (savedCustomer) {
                const parsedCustomer = JSON.parse(savedCustomer) as Customer;
                if (parsedCustomer && parsedCustomer._id) {
                    this.selectedCustomer = parsedCustomer;
                    this.customerControl.setValue(parsedCustomer.name);
                }
            }
        } catch (e) {
            console.warn('Failed to restore from localStorage', e);
        }
    }

    loadDefaultCustomer(): void {
        // Auto-select Walk-In Customer for quick POS transactions
        this.posService.getWalkInCustomer().subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    this.selectedCustomer = res.data;
                    this.customerControl.setValue(res.data.name);
                    this.saveCustomerToStorage();
                }
            },
            error: () => {
                // Walk-in customer not found; user must select manually
                console.warn('Walk-In Customer not found in database');
            }
        });
    }

    ngAfterViewInit(): void {
        // Focus product input on load (optional, or maybe customer input)
        // setTimeout(() => this.productInput.nativeElement.focus(), 500);
    }

    loadSalesmanProfile(): void {
        this.salesmanService.getMyProfile().subscribe({
            next: (res) => {
                if (res.success) {
                    this.currentSalesman = res.data;
                    console.log('[POS] Salesman profile loaded:', this.currentSalesman?._id);
                } else {
                    console.warn('[POS] Failed to load salesman profile:', res.message);
                    this.toastService.error('Failed to load salesman profile. Please contact support.');
                }
            },
            error: (err) => {
                console.error('[POS] Error loading salesman profile:', err);
                const errorMsg = err?.error?.message || err?.message || 'Failed to load salesman profile';
                this.toastService.error(errorMsg + '. Ensure you are a registered salesman.');
            }
        });
    }

    setupSearch(): void {
        // Customer Search - triggers after 3 characters, fast debounce
        this.customerControl.valueChanges.pipe(
            filter((value): value is string => typeof value === 'string' && value.length >= 3),
            debounceTime(150), // Fast response
            distinctUntilChanged(),
            switchMap((value: string) => {
                this.isSearchingCustomers = true;
                // Remove routeId filter to allow global search for now
                return this.posService.searchCustomers(value, 10).pipe(
                    finalize(() => this.isSearchingCustomers = false),
                    catchError(() => {
                        this.isSearchingCustomers = false;
                        return of({ success: false, data: [] as Customer[] });
                    })
                );
            })
        ).subscribe(response => {
            this.customers = response.data || [];
        });

        // Item Search
        this.itemSearchControl.valueChanges.pipe(
            // Only search if query is at least 1 character or explicitly triggered
            filter((value): value is string => {
                const query = typeof value === 'string' ? value.trim() : '';
                return query.length >= 1; // Minimum 1 character to prevent empty searches
            }),
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(query => {
                this.isSearchingItems = true;
                return this.posService.searchItems(query, 50).pipe(
                    finalize(() => this.isSearchingItems = false),
                    catchError(err => {
                        console.error('[POS] Item search error:', err);
                        // If backend returns error related to warehouse, it's likely missing config
                        const errorMsg = err.error?.message || err.message || '';
                        if (errorMsg.toLowerCase().includes('warehouse')) {
                            this.toastService.error('Warehouse configuration missing for your account');
                        }
                        return of({ success: false, data: [] });
                    })
                );
            })
        ).subscribe(response => {
            this.searchItems = response.data || [];
        });
    }

    displayCustomer(customer: Customer): string {
        return customer ? customer.name : '';
    }

    onCustomerSelected(customer: Customer): void {
        this.selectedCustomer = customer;
        this.saveCustomerToStorage();
        // Focus on product input after selecting customer
        setTimeout(() => this.productInput.nativeElement.focus(), 100);
    }

    selectWalkIn(): void {
        this.posService.getWalkInCustomer().subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    this.onCustomerSelected(res.data);
                    this.customerControl.setValue(res.data.name);
                }
            }
        });
    }

    onCustomerInputFocus(): void {
        // If empty, trigger search to show Walk-In option
        if (!this.customerControl.value) {
            this.customerControl.setValue('');
        }
    }

    clearCustomer(): void {
        this.selectedCustomer = null;
        this.customerControl.setValue('');
        this.saveCustomerToStorage();
        // Focus back on customer input
        // (optional: we might want to keep focus on button or move to input)
    }

    onCustomerTypeChange(type: 'walkin' | 'registered'): void {
        this.customerType = type;
        this.clearCustomer();

        if (type === 'walkin') {
            // Auto-select Walk-In customer
            this.selectWalkIn();
        }
        // For 'registered', user will search and select
    }

    addToCart(item: Item): void {
        const currentCart = this.cart();
        const existingIndex = currentCart.findIndex(i => i._id === item._id);

        if (existingIndex > -1) {
            const updatedCart = [...currentCart];
            updatedCart[existingIndex] = {
                ...updatedCart[existingIndex],
                quantity: updatedCart[existingIndex].quantity + 1
            };
            this.cart.set(updatedCart);
            this.saveCartToStorage();
        } else {
            // Auto-select Batch (FEFO - First Expired First Out)
            let selectedBatch = '';
            let selectedExpiry = '';

            if (item.inventory && item.inventory.batches && item.inventory.batches.length > 0) {
                // Sort by expiry date ascending
                const sortedBatches = [...item.inventory.batches].sort((a, b) =>
                    new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
                );
                // Pick the first one (nearest expiry) that has stock > 0
                const bestBatch = sortedBatches.find(b => b.stock > 0) || sortedBatches[0];

                selectedBatch = bestBatch.batchNumber;
                selectedExpiry = bestBatch.expiryDate;
            }

            // Determine correct sale price (handle nested pricing object from backend)
            const actualSalePrice = item.pricing?.salePrice || item.salePrice || 0;

            this.cart.set([...currentCart, {
                ...item,
                salePrice: actualSalePrice, // Normalize price for cart
                quantity: 1,
                discount: 0,
                taxAmount: 0,
                lineTotal: actualSalePrice,
                selectedBatch,
                selectedExpiry
            }]);
            this.saveCartToStorage();
        }

        this.itemSearchControl.setValue('');
        this.searchItems = [];
        this.toastService.success(`${item.name} added`);

        // Keep focus on input for rapid entry
        setTimeout(() => this.productInput.nativeElement.focus(), 100);
    }

    updateQuantity(itemId: string, delta: number): void {
        const updatedCart = this.cart().map(item => {
            if (item._id === itemId) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQuantity };
            }
            return item;
        });
        this.cart.set(updatedCart);
        this.saveCartToStorage();
    }

    updateManualQuantity(itemId: string, value: number): void {
        const updatedCart = this.cart().map(item => {
            if (item._id === itemId) {
                const newQuantity = Math.max(1, value || 1); // Prevent 0 or null
                return { ...item, quantity: newQuantity };
            }
            return item;
        });
        this.cart.set(updatedCart);
        this.saveCartToStorage();
    }

    updateDiscount(itemId: string, discount: number): void {
        if (discount < 0 || discount > 100) return;

        const currentCart = this.cart();
        const updatedCart = currentCart.map(item => {
            if (item._id === itemId) {
                return { ...item, discount: discount };
            }
            return item;
        });
        this.cart.set(updatedCart);
        this.saveCartToStorage();
    }

    removeFromCart(itemId: string): void {
        this.cart.set(this.cart().filter(item => item._id !== itemId));
        this.saveCartToStorage();
    }

    clearCart(): void {
        this.cart.set([]);
        this.selectedCustomer = null;
        this.customerControl.setValue('');
        // Clear localStorage
        localStorage.removeItem(this.CART_STORAGE_KEY);
        localStorage.removeItem(this.CUSTOMER_STORAGE_KEY);
    }

    // State
    lastInvoice: any = null;
    lastPayment: any = null;

    submitInvoice(paymentData?: any): void {
        if (!this.selectedCustomer) {
            this.toastService.error('Please select a customer');
            return;
        }

        if (this.cart().length === 0) {
            this.toastService.error('Cart is empty');
            return;
        }

        this.isSubmitting = true;

        const invoiceData = this.getInvoiceData(paymentData);

        console.log('[POS] Submitting invoice data:', JSON.stringify(invoiceData, null, 2));

        this.posService.createInvoice(invoiceData).subscribe({
            next: (response) => {
                console.log('[POS] Invoice created successfully:', response);
                if (response.success) {
                    this.toastService.success('Invoice created successfully');

                    // If we were working on a recalled bill (draft/held), cancel the old one now that we have a new confirmed invoice
                    if (this.currentInvoiceId) {
                        this.posService.cancelInvoice(this.currentInvoiceId, 'Replaced by confirmed invoice').subscribe();
                        this.currentInvoiceId = null;
                    }

                    // Store invoice and payment data for receipt
                    this.lastInvoice = response.data;
                    this.lastPayment = paymentData || null;
                    this.today = new Date();

                    // Show receipt
                    this.showReceipt = true;
                    this.hasProcessedInvoice = true;

                    // Auto-print receipt for cash sales
                    if (paymentData && paymentData.mode === 'cash') {
                        setTimeout(() => this.printReceipt(), 300);
                    }
                }
                this.isSubmitting = false;
            },
            error: (error) => {
                console.error('[POS] Full error object:', error);
                const errorMsg = error?.error?.error?.message ||
                    error?.error?.message ||
                    error?.message ||
                    'Failed to create invoice';
                this.toastService.error(errorMsg);
                this.isSubmitting = false;
            }
        });
    }

    getInvoiceData(paymentData?: any): any {
        const invoiceData = {
            customerId: this.selectedCustomer!._id,
            invoiceSource: 'pos',
            items: this.cart().map(item => ({
                itemId: item._id,
                quantity: item.quantity,
                unitPrice: item.salePrice,
                gstRate: item.gstRate || item.tax?.gstRate || 18,
                discount: item.discount,
                batchNumber: item.selectedBatch || '',
                expiryDate: item.selectedExpiry || ''
            })),
            notes: ''
        };

        // Add salesmanId if available
        if (this.currentSalesman?._id) {
            (invoiceData as any).salesmanId = this.currentSalesman._id;
        }

        // Add payment data if provided
        if (paymentData) {
            (invoiceData as any).payment = paymentData;
        }

        return invoiceData;
    }


    openPaymentModal(): void {
        if (this.cart().length === 0 || !this.selectedCustomer) return;

        const dialogRef = this.dialog.open(PaymentModalComponent, {
            width: '450px',
            disableClose: true,
            data: {
                totalAmount: this.totals().grandTotal,
                customer: this.selectedCustomer
            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Result contains payment details
                // If result.isCredit is true, payment is undefined (Credit Sale)
                // If result.payment exists, it contains mode, amount, tendered
                this.submitInvoice(result.payment);
            }
        });
    }

    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            maximumFractionDigits: 0
        }).format(amount);
    }

    onProductInputEnter(): void {
        const query = this.itemSearchControl.value;
        if (!query || typeof query !== 'string') return;

        // 1. Try to find in current search results
        if (this.searchItems.length > 0) {
            this.addToCart(this.searchItems[0]);
            return;
        }

        // 2. If no results, try to fetch by barcode directly (fast path)
        this.isSearchingItems = true;
        this.posService.getItemByBarcode(query).subscribe({
            next: (res) => {
                if (res.success && res.data.item) {
                    this.addToCart(res.data.item);
                } else {
                    // 3. Fallback: Search by name strictly
                    this.performStrictSearch(query);
                }
                this.isSearchingItems = false;
            },
            error: () => {
                this.performStrictSearch(query);
            }
        });
    }

    private performStrictSearch(query: string): void {
        this.posService.searchItems(query, 1).subscribe({
            next: (res) => {
                if (res.success && res.data.length > 0) {
                    this.addToCart(res.data[0]);
                } else {
                    this.toastService.error('Product not found');
                }
                this.isSearchingItems = false;
            },
            error: () => {
                this.toastService.error('Error searching product');
                this.isSearchingItems = false;
            }
        });
    }


    toggleReceipt(): void {
        this.showReceipt = !this.showReceipt;
        this.today = new Date(); // Refresh date
    }

    onReceiptClose(): void {
        this.showReceipt = false;
        if (this.hasProcessedInvoice) {
            this.clearCart();
            this.hasProcessedInvoice = false;
            this.lastInvoice = null;
            this.lastPayment = null;
        }
    }

    printReceipt(): void {
        // Build receipt data from stored invoice + cart
        const invoiceNo = this.lastInvoice?.invoiceNumber || this.lastInvoice?.invoice?.invoiceNumber || '---';
        const customerName = this.selectedCustomer?.name || 'Walk-In Customer';
        const dateStr = this.today.toLocaleDateString('en-PK', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const timeStr = this.today.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
        const salesmanName = this.currentSalesman?.name || '';

        // Build item rows
        const cartItems = this.cart();
        let itemsHtml = '';
        cartItems.forEach(item => {
            const lineTotal = item.quantity * item.salePrice * (1 - (item.discount || 0) / 100);
            itemsHtml += `
                <tr>
                    <td colspan="3" style="font-weight:600;padding:3px 0 0;">${this.escapeHtml(item.name)}</td>
                </tr>
                <tr>
                    <td style="padding:0 0 4px;">${item.quantity} x ${item.salePrice.toFixed(2)}</td>
                    <td style="text-align:center;padding:0 0 4px;">${item.discount || 0}%</td>
                    <td style="text-align:right;padding:0 0 4px;font-weight:600;">${lineTotal.toFixed(2)}</td>
                </tr>`;
        });

        const totals = this.totals();
        const payment = this.lastPayment;

        // Build payment section
        let paymentHtml = '';
        if (payment) {
            paymentHtml = `
                <tr><td colspan="3" style="border-top:1px dashed #000;padding-top:6px;"></td></tr>
                <tr>
                    <td colspan="2">Payment Mode</td>
                    <td style="text-align:right;text-transform:uppercase;font-weight:600;">${payment.mode}</td>
                </tr>`;
            if (payment.mode === 'cash' && payment.tendered) {
                paymentHtml += `
                <tr>
                    <td colspan="2">Cash Tendered</td>
                    <td style="text-align:right;">${payment.tendered.toFixed(2)}</td>
                </tr>
                <tr>
                    <td colspan="2" style="font-weight:700;">Change Due</td>
                    <td style="text-align:right;font-weight:700;">${payment.change.toFixed(2)}</td>
                </tr>`;
            }
        }

        const receiptHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt #${invoiceNo}</title>
    <style>
        @page { size: 80mm auto; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Courier New', 'Lucida Console', monospace;
            font-size: 12px;
            width: 80mm;
            padding: 8px;
            color: #000;
        }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .divider {
            border: none;
            border-top: 1px dashed #000;
            margin: 6px 0;
        }
        .shop-name { font-size: 18px; font-weight: 800; margin-bottom: 2px; }
        .shop-detail { font-size: 10px; margin-bottom: 1px; }
        .meta-table { width: 100%; font-size: 11px; margin: 4px 0; }
        .meta-table td { padding: 1px 0; }
        .meta-table .label { font-weight: 600; }
        .meta-table .val { text-align: right; }
        .items-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .items-table td { padding: 2px 0; vertical-align: top; }
        .totals-table { width: 100%; font-size: 12px; }
        .totals-table td { padding: 2px 0; }
        .totals-table .grand {
            font-size: 16px;
            font-weight: 800;
            padding-top: 4px;
        }
        .footer { font-size: 10px; text-align: center; margin-top: 10px; }
        .footer p { margin: 2px 0; }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="center">
        <div class="shop-name">Indus Pharma</div>
        <div class="shop-detail">123 Main Street, City</div>
        <div class="shop-detail">Phone: (123) 456-7890</div>
    </div>
    <hr class="divider">

    <!-- Meta Info -->
    <table class="meta-table">
        <tr><td class="label">Invoice #:</td><td class="val">${invoiceNo}</td></tr>
        <tr><td class="label">Date:</td><td class="val">${dateStr} ${timeStr}</td></tr>
        <tr><td class="label">Customer:</td><td class="val">${this.escapeHtml(customerName)}</td></tr>
        ${salesmanName ? `<tr><td class="label">Salesman:</td><td class="val">${this.escapeHtml(salesmanName)}</td></tr>` : ''}
    </table>
    <hr class="divider">

    <!-- Column Headers -->
    <table class="items-table">
        <tr style="font-weight:700;border-bottom:1px dashed #000;">
            <td>Item</td>
            <td style="text-align:center;">Disc</td>
            <td style="text-align:right;">Amount</td>
        </tr>
        ${itemsHtml}
    </table>
    <hr class="divider">

    <!-- Totals -->
    <table class="totals-table">
        <tr>
            <td>Subtotal</td>
            <td style="text-align:right;">${totals.subtotal.toFixed(2)}</td>
        </tr>
        ${totals.totalDiscount > 0 ? `<tr><td>Discount</td><td style="text-align:right;">-${totals.totalDiscount.toFixed(2)}</td></tr>` : ''}
        ${totals.gstTotal > 0 ? `<tr><td>GST</td><td style="text-align:right;">${totals.gstTotal.toFixed(2)}</td></tr>` : ''}
        ${totals.advanceTaxTotal > 0 ? `<tr><td>Advance Tax</td><td style="text-align:right;">${totals.advanceTaxTotal.toFixed(2)}</td></tr>` : ''}
        <tr>
            <td class="grand">TOTAL</td>
            <td class="grand" style="text-align:right;">${totals.grandTotal.toFixed(2)}</td>
        </tr>
        ${paymentHtml}
    </table>
    <hr class="divider">

    <!-- Footer -->
    <div class="footer">
        <p style="font-weight:600;">Thank you for your purchase!</p>
        <p>Goods once sold are not returnable</p>
        <p style="margin-top:6px;">Software by Indus Traders</p>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>`;

        const popupWin = window.open('', '_blank', 'width=350,height=600');
        if (popupWin) {
            popupWin.document.open();
            popupWin.document.write(receiptHtml);
            popupWin.document.close();
        } else {
            this.toastService.error('Popup blocked! Please allow popups for this site to print receipts.');
        }
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isExpired(dateStr?: string): boolean {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    }
}
