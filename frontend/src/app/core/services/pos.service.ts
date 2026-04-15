import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Customer {
    _id: string;
    code: string;
    name: string;
    type: string;
    phone?: string;
    email?: string;
    address?: string;
    taxStatus?: string;      // 'filer' or 'non-filer'
    isNonFiler?: boolean;    // Specific flag
    contactInfo?: {
        phone?: string;
        email?: string;
        address?: string;
        city?: string;
    };
    financialInfo: {
        creditLimit: number;
        paymentTerms: number;
    };
}

export interface Batch {
    batchNumber: string;
    expiryDate: string;
    stock: number;
    costPrice?: number;
    salePrice?: number;
}

export interface Item {
    _id: string;
    code: string;
    name: string;
    category: string;
    categoryId?: { _id: string; name: string };
    companyId?: { _id: string; name: string; code: string };
    unitPrice: number;
    salePrice: number;
    pricing?: {
        purchasePrice?: number;
        costPrice: number;
        salePrice: number;
    };
    barcode?: string;
    sku?: string;
    stock: number;
    availableStock?: number; // From POS endpoint
    unit: string;
    manufacturer?: string;
    inventory?: {
        currentStock: number;
        batches: Batch[];
        minimumStock?: number;
        maximumStock?: number;
    };
    batches?: Batch[]; // From POS barcode scan
    tax?: {
        gstRate: number;
        whtRate: number;
    };
    formulaName?: string;
    formulaSize?: string;
    packSize?: number;
    gstRate?: number; // From POS endpoint
}

export interface POSItem {
    id: string;
    name: string;
    code: string;
    barcode?: string;
    sku?: string;
    price: number;
    unit: string;
    gstRate: number;
    packSize: number;
    formulaName: string;
    formulaSize: string;
    availableStock: number;
    batches?: Array<{
        batchNumber: string;
        expiryDate: string;
        availableQuantity: number;
        manufacturingDate: string;
    }>;
}

export interface POSCustomer {
    id: string;
    name: string;
    code: string;
    phone?: string;
    creditLimit: number;
    currentBalance: number;
    availableCredit: number;
}

export interface InvoiceItem {
    itemId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    gstRate?: number;
    taxAmount: number;
    lineTotal: number;
}

export interface CreateInvoiceData {
    type: 'sales';
    customerId: string;
    salesmanId?: string;
    invoiceDate: string;
    dueDate: string;
    items: InvoiceItem[];
    totals: {
        subtotal: number;
        totalDiscount: number;
        totalTax: number;
        grandTotal: number;
    };
    status: 'draft' | 'confirmed';
    paymentStatus: 'pending';
    notes?: string;
}

export interface Invoice {
    _id: string;
    invoiceNumber: string;
    type: string;
    customerId: Customer;
    invoiceDate: string;
    dueDate: string;
    items: Array<InvoiceItem & { itemId: Item }>;
    totals: {
        subtotal: number;
        totalDiscount: number;
        totalTax: number;
        grandTotal: number;
    };
    status: string;
    paymentStatus: string;
    notes?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class PosService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    /**
     * Search customers using POS endpoint
     */
    searchCustomers(query: string, limit: number = 10, routeId?: string): Observable<PaginatedResponse<Customer>> {
        let params = new HttpParams()
            .set('q', query)
            .set('limit', limit.toString());

        return this.http.get<any>(
            `${this.baseUrl}/salesman/pos/customers/search`,
            { params }
        ).pipe(
            map(response => {
                // Backend returns { success: true, data: [...], count: N }
                // Map to PaginatedResponse format
                return {
                    success: response.success,
                    data: response.data || [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        totalItems: response.count || 0,
                        itemsPerPage: limit
                    }
                };
            })
        );
    }

    /**
     * Get paginated items with filters
     */
    getItems(page: number, limit: number, filters: { keyword?: string; category?: string; stockStatus?: string } = {}): Observable<PaginatedResponse<Item>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        if (filters.keyword) params = params.set('keyword', filters.keyword);
        if (filters.category) params = params.set('category', filters.category);
        if (filters.stockStatus) params = params.set('stockStatus', filters.stockStatus);

        return this.http.get<PaginatedResponse<Item>>(`${this.baseUrl}/items`, { params });
    }

    /**
     * Get customer by ID
     */
    getCustomerById(id: string): Observable<ApiResponse<{ customer: Customer }>> {
        return this.http.get<ApiResponse<{ customer: Customer }>>(
            `${this.baseUrl}/customers/${id}`
        );
    }

    /**
     * Get walk-in customer using POS endpoint
     */
    getWalkInCustomer(): Observable<ApiResponse<Customer>> {
        return this.http.get<any>(
            `${this.baseUrl}/salesman/pos/customers/walk-in`
        ).pipe(
            map(response => {
                // Backend returns { success: true, data: { id, name, code, ... } }
                const posCustomer = response.data;
                const customer: Customer = {
                    _id: posCustomer.id,
                    code: posCustomer.code,
                    name: posCustomer.name,
                    type: 'cash',
                    phone: posCustomer.phone,
                    contactInfo: {
                        phone: posCustomer.phone
                    },
                    financialInfo: {
                        creditLimit: posCustomer.creditLimit || 0,
                        paymentTerms: 0
                    }
                };

                return {
                    success: response.success,
                    data: customer
                };
            })
        );
    }

    /**
     * Get customer by code (legacy - kept for compatibility)
     */
    getCustomerByCode(code: string): Observable<ApiResponse<Customer>> {
        if (code === 'CUST-WALKIN' || code === 'WALK-IN') {
            return this.getWalkInCustomer();
        }
        return this.http.get<ApiResponse<Customer>>(
            `${this.baseUrl}/customers/code/${code}`
        );
    }

    /**
     * Search items using POS endpoint
     */
    searchItems(query: string, limit: number = 20): Observable<PaginatedResponse<Item>> {
        const params = new HttpParams()
            .set('q', query)
            .set('limit', limit.toString());

        return this.http.get<any>(
            `${this.baseUrl}/salesman/pos/items/search`,
            { params }
        ).pipe(
            map(response => {
                // Backend returns { success: true, data: [...], count: N }
                // Map POSItem format to Item format
                const items = (response.data || []).map((posItem: any) => ({
                    _id: posItem.id,
                    code: posItem.code,
                    name: posItem.name,
                    barcode: posItem.barcode,
                    sku: posItem.sku,
                    salePrice: posItem.price,
                    unitPrice: posItem.price,
                    unit: posItem.unit,
                    stock: posItem.availableStock,
                    availableStock: posItem.availableStock,
                    formulaName: posItem.formulaName,
                    formulaSize: posItem.formulaSize,
                    packSize: posItem.packSize,
                    category: '',
                    tax: {
                        gstRate: posItem.gstRate,
                        whtRate: 0
                    },
                    gstRate: posItem.gstRate
                }));

                return {
                    success: response.success,
                    data: items,
                    pagination: {
                        currentPage: 1,
                        totalPages: 1,
                        totalItems: response.count || 0,
                        itemsPerPage: limit
                    }
                };
            })
        );
    }

    /**
     * Get item by barcode using POS endpoint
     */
    getItemByBarcode(barcode: string): Observable<ApiResponse<{ item: Item, batchSelectionRequired?: boolean }>> {
        return this.http.post<any>(
            `${this.baseUrl}/salesman/pos/items/scan-barcode`,
            { barcode }
        ).pipe(
            map((response: any) => {
                // Backend POS endpoint returns { success: true, data: { id, name, batches: [...] } }
                const posItem = response.data;
                const item: Item = {
                    _id: posItem.id,
                    code: posItem.code,
                    name: posItem.name,
                    barcode: posItem.barcode,
                    sku: posItem.sku,
                    salePrice: posItem.price,
                    unitPrice: posItem.price,
                    unit: posItem.unit,
                    stock: posItem.availableStock,
                    availableStock: posItem.availableStock,
                    formulaName: posItem.formulaName,
                    formulaSize: posItem.formulaSize,
                    packSize: posItem.packSize,
                    category: '',
                    tax: {
                        gstRate: posItem.gstRate,
                        whtRate: 0
                    },
                    gstRate: posItem.gstRate,
                    batches: posItem.batches?.map((b: any) => ({
                        batchNumber: b.batchNumber,
                        expiryDate: b.expiryDate,
                        stock: b.availableQuantity,
                        manufacturingDate: b.manufacturingDate
                    })),
                    inventory: posItem.batches ? {
                        currentStock: posItem.availableStock,
                        batches: posItem.batches.map((b: any) => ({
                            batchNumber: b.batchNumber,
                            expiryDate: b.expiryDate,
                            stock: b.availableQuantity,
                            manufacturingDate: b.manufacturingDate
                        }))
                    } : undefined
                };

                return {
                    success: response.success,
                    message: response.message,
                    data: {
                        item: item,
                        batchSelectionRequired: posItem.batches?.length > 1
                    }
                };
            })
        );
    }

    /**
     * Get item by ID
     */
    getItemById(id: string): Observable<ApiResponse<{ item: Item }>> {
        return this.http.get<ApiResponse<{ item: Item }>>(
            `${this.baseUrl}/items/${id}`
        );
    }

    /**
     * Create sales invoice using POS endpoint
     */
    createInvoice(invoiceData: CreateInvoiceData): Observable<ApiResponse<{ invoice: Invoice }>> {
        // Transform frontend invoice data to match POS backend expectations
        // Backend expects: { customerId, items: [{ itemId, quantity, unitPrice, discount, gstRate }], notes }
        // Backend will handle: batch selection (FEFO), GST calculation, stock validation
        const posInvoiceData = {
            customerId: invoiceData.customerId,
            items: invoiceData.items.map(item => ({
                itemId: item.itemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0, // Line item discount percentage
                gstRate: item.gstRate || 18
            })),
            creditDays: 0, // Immediate payment for POS
            notes: invoiceData.notes || ''
        };

        // Add payment data if provided
        if ((invoiceData as any).payment) {
            (posInvoiceData as any).payment = (invoiceData as any).payment;
        }

        return this.http.post<ApiResponse<{ invoice: Invoice }>>(
            `${this.baseUrl}/salesman/pos/invoices`,
            posInvoiceData
        );
    }

    /**
     * Create draft invoice using POS endpoint
     */
    createDraftInvoice(invoiceData: CreateInvoiceData): Observable<ApiResponse<{ invoice: Invoice }>> {
        const posInvoiceData = {
            customerId: invoiceData.customerId,
            items: invoiceData.items.map(item => ({
                itemId: item.itemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount || 0,
                gstRate: item.gstRate || 18
            })),
            creditDays: 0,
            notes: invoiceData.notes || ''
        };

        return this.http.post<ApiResponse<{ invoice: Invoice }>>(
            `${this.baseUrl}/salesman/pos/invoices/draft`,
            posInvoiceData
        );
    }

    /**
     * Hold an invoice using POS endpoint
     */
    holdInvoice(invoiceId: string, reason: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.baseUrl}/salesman/pos/invoices/${invoiceId}/hold`, { reason });
    }

    /**
     * Recall a held invoice using POS endpoint
     */
    recallInvoice(invoiceId: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.baseUrl}/salesman/pos/invoices/${invoiceId}/recall`, {});
    }

    /**
     * Get held invoices using POS endpoint
     */
    getHeldInvoices(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/salesman/pos/invoices/held`);
    }

    /**
     * Cancel an invoice using POS endpoint
     */
    cancelInvoice(invoiceId: string, reason: string): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.baseUrl}/salesman/pos/invoices/${invoiceId}/cancel`, { reason });
    }

    /**
     * Get draft invoices using POS endpoint
     */
    getDraftInvoices(): Observable<ApiResponse<Invoice[]>> {
        return this.http.get<ApiResponse<Invoice[]>>(
            `${this.baseUrl}/salesman/pos/invoices/draft`
        );
    }

    /**
     * Create a sales return from POS
     */
    createReturn(data: {
        originalInvoiceId: string;
        returnItems: Array<{ itemId: string; batchNumber?: string; quantity: number }>;
        returnReason: string;
        returnNotes?: string;
    }): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(
            `${this.baseUrl}/salesman/pos/returns`,
            data
        );
    }

    /**
     * Get salesman's return history
     */
    getReturns(page: number = 1, limit: number = 20): Observable<any> {
        const params = new HttpParams()
            .set('page', page.toString())
            .set('limit', limit.toString());

        return this.http.get<any>(
            `${this.baseUrl}/salesman/pos/returns`,
            { params }
        );
    }

    /**
     * Calculate cart totals (Synchronized with backend SalesInvoiceService.calculateInvoiceTotals)
     * @param items - Array of cart items
     * @param customerInfo - Optional customer info for non-filer tax
     */
    calculateTotals(
        items: Array<{ quantity: number; unitPrice: number; discount: number; gstRate?: number; advanceTaxRate?: number }>,
        customerInfo?: { isNonFiler?: boolean }
    ): {
        subtotal: number;
        totalDiscount: number;
        totalTax: number;
        gstTotal: number;
        advanceTaxTotal: number;
        nonFilerGst: number;
        grandTotal: number;
    } {
        let grossTotal = 0;
        let discountTotal = 0;
        let gstTotal = 0;
        let advanceTaxTotal = 0;

        items.forEach(item => {
            const lineSubtotal = item.quantity * item.unitPrice;
            const lineDiscount = (lineSubtotal * item.discount) / 100;
            const lineAfterDiscount = lineSubtotal - lineDiscount;

            const gstRate = item.gstRate ?? 18;
            const lineGst = (lineAfterDiscount * gstRate) / 100;

            const advanceTaxRate = item.advanceTaxRate ?? 0;
            const lineAdvanceTax = (lineAfterDiscount * advanceTaxRate) / 100;

            grossTotal += lineSubtotal;
            discountTotal += lineDiscount;
            gstTotal += lineGst;
            advanceTaxTotal += lineAdvanceTax;
        });

        // Calculate non-filer GST if applicable (match SalesInvoiceService)
        const nonFilerGst = customerInfo?.isNonFiler
            ? (grossTotal * 0.1) / 100
            : 0;

        const grandTotal = grossTotal - discountTotal + gstTotal + advanceTaxTotal + nonFilerGst;

        const round = (val: number) => Math.round(val * 100) / 100;

        return {
            subtotal: round(grossTotal),
            totalDiscount: round(discountTotal),
            totalTax: round(gstTotal + advanceTaxTotal + nonFilerGst),
            gstTotal: round(gstTotal),
            advanceTaxTotal: round(advanceTaxTotal),
            nonFilerGst: round(nonFilerGst),
            grandTotal: round(grandTotal)
        };
    }
}
