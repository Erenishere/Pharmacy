import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: any;
    pagination?: {
        totalItems: number;
        currentPage: number;
        totalPages: number;
    };
}

interface Item {
    _id: string;
    code: string;
    name: string;
    description?: string;
    category: string | { _id: string; name: string };
    companyId?: string | { _id: string; name: string };
    formulaId?: { _id: string; name: string };
    formulaSizeId?: { _id: string; size: string; strength: string };
    genericId?: string | { _id: string; name: string };
    mainSupplierId?: string | { _id: string; name: string };
    unit?: string;
    pricing?: {
        costPrice?: number;
        salePrice?: number;
        currency?: string;
        unit?: {
            purchaseTP: number;
            saleTP: number;
            retailPrice: number;
        };
        box?: {
            purchaseTP: number;
            saleTP: number;
            retailPrice: number;
        };
        carton?: {
            purchaseTP: number;
            saleTP: number;
        };
    };
    tax?: {
        gstRate?: number;
        whtRate?: number;
        taxCategory?: string;
        gstFiler?: number;
        gstNonFiler?: number;
    };
    inventory?: {
        currentStock?: number;
        minimumStock?: number;
        maximumStock?: number;
    };
    packaging?: {
        cartonDimensions?: {
            length: number;
            width: number;
            height: number;
        };
        unitsInCarton?: number;
        unitsInBox?: number;
        boxesInCarton?: number;
        weight?: {
            unit: number;
            box: number;
            carton: number;
        };
    };
    barcode?: string;
    sku?: string;
    packSize?: number;
    image?: string;
    supplier?: {
        primarySupplierId?: string;
        supplierItemCode?: string;
        leadTimeFromSupplier?: number;
    };
    regulatory?: {
        taxRegistrationNumber?: string;
        complianceStatus?: string;
    };
    metadata?: {
        manufacturer?: string;
        storageConditions?: string;
        handlingInstructions?: string;
    };
    additionalCharges?: {
        goodsChargesPerUnit?: number;
    };
    alerts?: {
        noSalesAlertDays?: number;
    };
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ItemService {
    private apiUrl = `${environment.apiUrl}/items`;
    private companyFilterOptions$: Observable<any[]> | null = null;
    private categoryFilterOptions$: Observable<any[]> | null = null;

    constructor(private http: HttpClient) { }

    createItem(itemData: any): Observable<ApiResponse<Item>> {
        return this.http.post<ApiResponse<Item>>(this.apiUrl, itemData);
    }

    updateItem(id: string, itemData: any): Observable<ApiResponse<Item>> {
        return this.http.put<ApiResponse<Item>>(`${this.apiUrl}/${id}`, itemData);
    }

    getItem(id: string): Observable<ApiResponse<Item>> {
        return this.http.get<ApiResponse<Item>>(`${this.apiUrl}/${id}`);
    }

    getItems(params?: any): Observable<ApiResponse<Item[]>> {
        return this.http.get<ApiResponse<Item[]>>(this.apiUrl, { params });
    }

    getCompanyFilterOptions(forceRefresh = false): Observable<any[]> {
        if (!forceRefresh && this.companyFilterOptions$) {
            return this.companyFilterOptions$;
        }

        this.companyFilterOptions$ = this.http
            .get<ApiResponse<any[]>>(`${environment.apiUrl}/companies`, { params: { isActive: true, limit: 500 } })
            .pipe(
                map((response) => response.data || []),
                shareReplay(1)
            );

        return this.companyFilterOptions$;
    }

    getCategoryFilterOptions(forceRefresh = false): Observable<any[]> {
        if (!forceRefresh && this.categoryFilterOptions$) {
            return this.categoryFilterOptions$;
        }

        this.categoryFilterOptions$ = this.http
            .get<ApiResponse<any[]>>(`${environment.apiUrl}/categories`, { params: { isActive: true, limit: 500 } })
            .pipe(
                map((response) => response.data || []),
                shareReplay(1)
            );

        return this.categoryFilterOptions$;
    }

    deleteItem(id: string): Observable<ApiResponse<any>> {
        return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
    }

    searchItems(query: string, params?: any): Observable<ApiResponse<Item[]>> {
        return this.http.get<ApiResponse<Item[]>>(this.apiUrl, {
            params: { ...params, search: query }
        });
    }

    getLowStockItems(params?: any): Observable<ApiResponse<Item[]>> {
        return this.http.get<ApiResponse<Item[]>>(`${this.apiUrl}/low-stock`, { params });
    }

    exportItems(format: 'excel' | 'pdf' = 'excel', params?: any): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/export`, {
            params: { ...(params || {}), format },
            responseType: 'blob'
        });
    }

    getItemStock(itemId: string, warehouseId: string): Observable<ApiResponse<{ availableStock: number; totalStock: number; reservedStock: number }>> {
        return this.http.get<ApiResponse<{ availableStock: number; totalStock: number; reservedStock: number }>>(
            `${this.apiUrl}/${itemId}/stock/${warehouseId}`
        );
    }
}
