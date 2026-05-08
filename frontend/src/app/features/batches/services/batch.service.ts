import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_CONFIG } from '../../../core/constants/api.constants';
import {
    Batch,
    BatchResponse,
    CreateBatchRequest,
    UpdateBatchRequest,
    QuantityAdjustment,
    PaginationParams
} from '../models/batch.model';
import { BatchFilter } from '../models/batch-filter.model';

@Injectable({
    providedIn: 'root'
})
export class BatchService {
    private apiUrl = `${API_CONFIG.BASE_URL}/batches`;

    constructor(private http: HttpClient) { }

    /**
     * Get batches with filtering and pagination
     */
    getBatches(filter?: BatchFilter, pagination?: PaginationParams): Observable<BatchResponse> {
        let params = new HttpParams();

        if (pagination) {
            params = params.set('page', pagination.page.toString());
            params = params.set('limit', pagination.limit.toString());
            if (pagination.sortBy) {
                params = params.set('sortBy', pagination.sortBy);
            }
            if (pagination.sortOrder) {
                params = params.set('sortOrder', pagination.sortOrder);
            }
        }

        if (filter) {
            if (filter.itemSearch) {
                params = params.set('itemSearch', filter.itemSearch);
            }
            if (filter.locationIds && filter.locationIds.length > 0) {
                params = params.set('locationIds', filter.locationIds.join(','));
            }
            if (filter.supplierIds && filter.supplierIds.length > 0) {
                params = params.set('supplierIds', filter.supplierIds.join(','));
            }
            if (filter.statuses && filter.statuses.length > 0) {
                params = params.set('statuses', filter.statuses.join(','));
            }
            if (filter.expiryDateRange?.start) {
                params = params.set('expiryStart', filter.expiryDateRange.start.toISOString());
            }
            if (filter.expiryDateRange?.end) {
                params = params.set('expiryEnd', filter.expiryDateRange.end.toISOString());
            }
            if (filter.quantityRange?.min !== undefined) {
                params = params.set('quantityMin', filter.quantityRange.min.toString());
            }
            if (filter.quantityRange?.max !== undefined) {
                params = params.set('quantityMax', filter.quantityRange.max.toString());
            }
            if (filter.includeExpired !== undefined) {
                params = params.set('includeExpired', filter.includeExpired.toString());
            }
        }

        return this.http.get<BatchResponse>(this.apiUrl, { params });
    }

    /**
     * Get batch by ID
     */
    getBatchById(id: string): Observable<Batch> {
        return this.http.get<{ success: boolean; data: Batch }>(`${this.apiUrl}/${id}`).pipe(
            map(response => response.data)
        );
    }

    /**
     * Create new batch
     */
    createBatch(batch: CreateBatchRequest): Observable<Batch> {
        return this.http.post<{ success: boolean; data: Batch }>(this.apiUrl, batch).pipe(
            map(response => response.data)
        );
    }

    /**
     * Update existing batch
     */
    updateBatch(id: string, batch: UpdateBatchRequest): Observable<Batch> {
        return this.http.put<{ success: boolean; data: Batch }>(`${this.apiUrl}/${id}`, batch).pipe(
            map(response => response.data)
        );
    }

    /**
     * Adjust batch quantity
     */
    adjustQuantity(id: string, adjustment: QuantityAdjustment): Observable<Batch> {
        return this.http.patch<{ success: boolean; data: Batch }>(`${this.apiUrl}/${id}/quantity`, adjustment).pipe(
            map(response => response.data)
        );
    }

    /**
     * Delete batch
     */
    deleteBatch(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    /**
     * Get expiring batches
     */
    getExpiringBatches(days: number, locationId?: string): Observable<Batch[]> {
        let params = new HttpParams().set('days', days.toString());
        if (locationId) {
            params = params.set('locationId', locationId);
        }
        return this.http.get<{ success: boolean; data: Batch[] }>(`${this.apiUrl}/expiring-soon`, { params }).pipe(
            map(response => response.data)
        );
    }

    /**
     * Get next batch number for an item
     */
    getNextBatchNumber(itemId: string): Observable<{ batchNumber: string }> {
        return this.http.get<{ success: boolean; data: { batchNumber: string } }>(`${API_CONFIG.BASE_URL}/items/${itemId}/next-batch-number`).pipe(
            map(response => response.data)
        );
    }

    /**
     * Get batch statistics
     */
    getBatchStatistics(filters?: { locationIds?: string[]; supplierIds?: string[]; status?: string }): Observable<any> {
        let params = new HttpParams();
        if (filters?.locationIds && filters.locationIds.length > 0) {
            params = params.set('locationIds', filters.locationIds.join(','));
        }
        if (filters?.supplierIds && filters.supplierIds.length > 0) {
            params = params.set('supplierIds', filters.supplierIds.join(','));
        }
        if (filters?.status) {
            params = params.set('status', filters.status);
        }
        return this.http.get<any>(`${this.apiUrl}/statistics`, { params });
    }

    /**
     * Get expired batches
     */
    getExpiredBatches(locationId?: string): Observable<Batch[]> {
        let params = new HttpParams();
        if (locationId) {
            params = params.set('locationId', locationId);
        }
        return this.http.get<{ success: boolean; data: Batch[] }>(`${this.apiUrl}/expired`, { params }).pipe(
            map(response => response.data)
        );
    }
}
