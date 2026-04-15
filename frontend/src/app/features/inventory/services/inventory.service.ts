import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  StockLevel,
  StockOverview,
  WarehouseStock,
  StockTransfer,
  StockAdjustment,
  StockQueryParams,
  ApiResponse
} from '../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private baseUrl = `${environment.apiUrl}/inventory`;

  constructor(private http: HttpClient) { }

  /**
   * Get stock levels with filters
   */
  getStockLevels(params: StockQueryParams = {}): Observable<ApiResponse<StockLevel[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<StockLevel[]>>(`${this.baseUrl}/stock`, { params: httpParams });
  }

  /**
   * Get stock overview/summary
   */
  getStockOverview(warehouseId?: string): Observable<ApiResponse<StockOverview>> {
    let params = new HttpParams();
    if (warehouseId) {
      params = params.set('warehouseId', warehouseId);
    }
    return this.http.get<ApiResponse<StockOverview>>(`${this.baseUrl}/stock/overview`, { params });
  }

  /**
   * Get warehouse-wise stock for a specific item
   */
  getWarehouseStock(itemId: string): Observable<ApiResponse<StockLevel[]>> {
    return this.http.get<ApiResponse<StockLevel[]>>(`${this.baseUrl}/stock`, {
      params: new HttpParams().set('itemId', itemId)
    });
  }

  /**
   * Get stock for a specific warehouse
   */
  getStockByWarehouse(warehouseId: string, params: StockQueryParams = {}): Observable<ApiResponse<StockLevel[]>> {
    let httpParams = new HttpParams().set('warehouseId', warehouseId);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '' && key !== 'warehouseId') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<StockLevel[]>>(`${this.baseUrl}/stock`, { params: httpParams });
  }


  /**
   * Get low stock items
   */
  getLowStockItems(warehouseId?: string): Observable<ApiResponse<StockLevel[]>> {
    let params = new HttpParams();
    if (warehouseId) {
      params = params.set('warehouseId', warehouseId);
    }
    return this.http.get<ApiResponse<StockLevel[]>>(`${this.baseUrl}/low-stock`, { params });
  }

  /**
   * Get reorder suggestions
   */
  getReorderSuggestions(warehouseId?: string): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (warehouseId) {
      params = params.set('warehouseId', warehouseId);
    }
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/reorder-suggestions`, { params });
  }

  /**
   * Create stock transfer
   */
  createTransfer(transferData: Partial<StockTransfer>): Observable<ApiResponse<StockTransfer>> {
    return this.http.post<ApiResponse<StockTransfer>>(`${this.baseUrl}/transfer`, transferData);
  }

  /**
   * Get stock transfers
   */
  getTransfers(params: any = {}): Observable<ApiResponse<StockTransfer[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<StockTransfer[]>>(`${this.baseUrl}/transfers`, { params: httpParams });
  }

  /**
   * Update transfer status
   */
  updateTransferStatus(transferId: string, status: string): Observable<ApiResponse<StockTransfer>> {
    return this.http.patch<ApiResponse<StockTransfer>>(`${this.baseUrl}/transfer/${transferId}/status`, { status });
  }

  /**
   * Create stock adjustment
   */
  createAdjustment(adjustmentData: Partial<StockAdjustment>): Observable<ApiResponse<StockAdjustment>> {
    return this.http.post<ApiResponse<StockAdjustment>>(`${this.baseUrl}/adjustment`, adjustmentData);
  }

  /**
   * Get stock adjustments
   */
  getAdjustments(params: any = {}): Observable<ApiResponse<StockAdjustment[]>> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });
    return this.http.get<ApiResponse<StockAdjustment[]>>(`${this.baseUrl}/adjustments`, { params: httpParams });
  }

  /**
   * Approve stock adjustment
   */
  approveAdjustment(adjustmentId: string): Observable<ApiResponse<StockAdjustment>> {
    return this.http.patch<ApiResponse<StockAdjustment>>(`${this.baseUrl}/adjustment/${adjustmentId}/approve`, {});
  }

  /**
   * Reject stock adjustment
   */
  rejectAdjustment(adjustmentId: string, reason: string): Observable<ApiResponse<StockAdjustment>> {
    return this.http.patch<ApiResponse<StockAdjustment>>(`${this.baseUrl}/adjustment/${adjustmentId}/reject`, { reason });
  }

  /**
   * Get stock movement history for an item
   */
  getMovementHistory(itemId: string, warehouseId?: string, days: number = 30): Observable<ApiResponse<any[]>> {
    let params = new HttpParams().set('days', days.toString());
    if (warehouseId) {
      params = params.set('warehouseId', warehouseId);
    }
    return this.http.get<ApiResponse<any[]>>(`${this.baseUrl}/movements/item/${itemId}`, { params });
  }

  /**
   * Reserve stock
   */
  reserveStock(itemId: string, warehouseId: string, quantity: number, referenceId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/reserve`, {
      itemId,
      warehouseId,
      quantity,
      referenceId
    });
  }

  /**
   * Release reservation
   */
  releaseReservation(reservationId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/release/${reservationId}`, {});
  }

  /**
   * Get stock valuation
   */
  getStockValuation(method: 'FIFO' | 'LIFO' | 'WeightedAverage' = 'FIFO', warehouseId?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('method', method);
    if (warehouseId) {
      params = params.set('warehouseId', warehouseId);
    }
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/valuation`, { params });
  }

  // Physical Count methods
  createPhysicalCount(countData: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/physical-count`, countData);
  }

  getPhysicalCounts(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, (value as any).toString());
      }
    });
    return this.http.get<any>(`${this.baseUrl}/physical-count`, { params: httpParams });
  }

  getPhysicalCountById(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/physical-count/${id}`);
  }

  updatePhysicalCount(id: string, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/physical-count/${id}`, data);
  }

  approvePhysicalCount(id: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/physical-count/${id}/approve`, {});
  }

  cancelPhysicalCount(id: string, reason: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/physical-count/${id}/cancel`, { reason });
  }

  // Report methods
  getStockSummary(warehouseId?: string, categoryId?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    if (categoryId) params = params.set('categoryId', categoryId);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/stock/summary`, { params });
  }

  getStockMovementReport(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, (value as any).toString());
      }
    });
    return this.http.get<any>(`${this.baseUrl}/movements`, { params });
  }

  getFastMovingItems(warehouseId?: string, days: number = 30, limit: number = 50): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('days', days.toString()).set('limit', limit.toString());
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/fast-moving`, { params });
  }

  getSlowMovingItems(warehouseId?: string, days: number = 90, limit: number = 50): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('days', days.toString()).set('limit', limit.toString());
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/slow-moving`, { params });
  }

  getDeadStockReport(warehouseId?: string, days: number = 180, limit: number = 50): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('days', days.toString()).set('limit', limit.toString());
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/dead-stock`, { params });
  }

  getStockAgingReport(warehouseId?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/aging`, { params });
  }

  getInventoryTurnover(warehouseId?: string, startDate?: string, endDate?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/turnover`, { params });
  }

  getLowStockReport(warehouseId?: string, limit: number = 50): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('limit', limit.toString());
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/low-stock`, { params });
  }

  getReorderSuggestionsReport(warehouseId?: string, limit: number = 50): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('limit', limit.toString());
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/reorder-suggestions`, { params });
  }

  getVarianceReport(warehouseId?: string, startDate?: string, endDate?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/reports/variance`, { params });
  }

  getWarehouseStockReport(warehouseId?: string): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (warehouseId) params = params.set('warehouseId', warehouseId);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/stock/warehouse`, { params });
  }
}
