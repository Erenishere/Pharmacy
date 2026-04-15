import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Batch,
  BatchStatistics,
  BatchQueryParams,
  ApiResponse
} from '../models/batch.model';

@Injectable({
  providedIn: 'root'
})
export class BatchService {
  private baseUrl = `${environment.apiUrl}/batches`;

  constructor(private http: HttpClient) {}

  /**
   * Get all batches with filtering and pagination
   */
  getAllBatches(params: BatchQueryParams = {}): Observable<ApiResponse<Batch[]>> {
    let httpParams = new HttpParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          httpParams = httpParams.set(key, value.join(','));
        } else {
          httpParams = httpParams.set(key, value.toString());
        }
      }
    });

    return this.http.get<ApiResponse<Batch[]>>(this.baseUrl, { params: httpParams });
  }

  /**
   * Get batch by ID
   */
  getBatchById(id: string): Observable<ApiResponse<Batch>> {
    return this.http.get<ApiResponse<Batch>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get batches by item ID
   */
  getBatchesByItem(itemId: string, options: any = {}): Observable<ApiResponse<Batch[]>> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<Batch[]>>(`${this.baseUrl}/item/${itemId}`, { params });
  }

  /**
   * Get batches by location/warehouse ID
   */
  getBatchesByLocation(locationId: string, options: any = {}): Observable<ApiResponse<Batch[]>> {
    let params = new HttpParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<Batch[]>>(`${this.baseUrl}/location/${locationId}`, { params });
  }

  /**
   * Get batches expiring soon
   */
  getExpiringBatches(days: number = 30, locationId?: string): Observable<ApiResponse<Batch[]>> {
    let params = new HttpParams().set('days', days.toString());
    if (locationId) {
      params = params.set('locationId', locationId);
    }
    return this.http.get<ApiResponse<Batch[]>>(`${this.baseUrl}/expiring-soon`, { params });
  }

  /**
   * Get expired batches
   */
  getExpiredBatches(locationId?: string): Observable<ApiResponse<Batch[]>> {
    let params = new HttpParams();
    if (locationId) {
      params = params.set('locationId', locationId);
    }
    return this.http.get<ApiResponse<Batch[]>>(`${this.baseUrl}/expired`, { params });
  }

  /**
   * Get batch statistics
   */
  getBatchStatistics(filters: any = {}): Observable<ApiResponse<BatchStatistics>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<BatchStatistics>>(`${this.baseUrl}/statistics`, { params });
  }

  /**
   * Create a new batch
   */
  createBatch(batchData: Partial<Batch>): Observable<ApiResponse<Batch>> {
    return this.http.post<ApiResponse<Batch>>(this.baseUrl, batchData);
  }

  /**
   * Update batch
   */
  updateBatch(id: string, batchData: Partial<Batch>): Observable<ApiResponse<Batch>> {
    return this.http.put<ApiResponse<Batch>>(`${this.baseUrl}/${id}`, batchData);
  }

  /**
   * Update batch quantity
   */
  updateBatchQuantity(id: string, quantity: number, options: any = {}): Observable<ApiResponse<Batch>> {
    return this.http.patch<ApiResponse<Batch>>(`${this.baseUrl}/${id}/quantity`, {
      quantity,
      ...options
    });
  }

  /**
   * Delete batch
   */
  deleteBatch(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get next available batch number for an item
   */
  getNextBatchNumber(itemId: string): Observable<ApiResponse<{ batchNumber: string }>> {
    return this.http.get<ApiResponse<{ batchNumber: string }>>(`${this.baseUrl}/item/${itemId}/next-batch-number`);
  }
}
