import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: any;
  pagination?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ItemPricing {
  purchasePrice: number;
  boxPurchasePrice?: number;
  cartonPurchasePrice?: number;
  costPrice?: number;
  salePrice: number;
  boxSalePrice?: number;
  cartonSalePrice?: number;
  tradePrice?: number;
  retailPrice: number;
  boxRetailPrice?: number;
  wholesalePrice: number;
  distributorPrice: number;
  mrp: number;
  discountPercentage?: number;
  goodsChargesOnUnit?: number;
  currency?: string;
}

export interface ItemInventory {
  openingStock: number;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  reorderPoint: number;
  leadTime: number;
  location?: string;
  alertNoSalesDays?: number;
  lastSaleDate?: string;
}

export interface CartonDimensions {
  length?: number;
  width?: number;
  height?: number;
}

export interface CartonInfo {
  size?: CartonDimensions;
  unitsInCarton?: number;
  boxInCarton?: number;
  weight?: number;
}

export interface BoxInfo {
  unitsInBox?: number;
  weight?: number;
}

export interface ItemTax {
  taxType: string;
  taxPercentage: number;
  gstRate?: number;
  gstRateNonFilter?: number;
  whtRate?: number;
  hsnCode?: string;
  taxRegistrationNumber?: string;
  regulatoryStatus?: string;
  licenseNumbers?: string[];
}

export interface ItemSpecifications {
  unitOfMeasurement: string;
  packingSize: number;
  batchTracking: boolean;
  expiryTracking: boolean;
  barcode?: string;
  sku?: string;
}

export interface ItemSupplier {
  primarySupplierId?: string;
  alternativeSuppliers?: string[];
  supplierItemCode?: string;
  supplierLeadTime?: number;
}

export interface Item {
  _id: string;
  code: string;
  name: string;
  description?: string;
  companyId: string;
  sellingGroup?: string;
  companyGroupId?: string;
  formulaId?: string;
  formulaSizeId?: string;
  categoryId?: string;
  subCategoryId?: string;
  businessTypeId?: string;
  supplierId?: string;
  pricing: ItemPricing;
  inventory: ItemInventory;
  tax: ItemTax;
  specifications: ItemSpecifications;
  supplier?: ItemSupplier;
  carton?: CartonInfo;
  box?: BoxInfo;
  unitWeight?: number;
  productImage?: string;
  storageConditions?: string;
  handlingInstructions?: string;
  safetyInformation?: string;
  isActive: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemFilters {
  search?: string;
  companyId?: string;
  categoryId?: string;
  sellingGroup?: string;
  companyGroupId?: string;
  businessTypeId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ItemMasterService {
  private apiUrl = `${environment.apiUrl}/items`;

  constructor(private http: HttpClient) { }

  createItem(itemData: Partial<Item>): Observable<ApiResponse<Item>> {
    return this.http.post<ApiResponse<Item>>(this.apiUrl, itemData);
  }

  getItems(filters?: ItemFilters): Observable<ApiResponse<Item[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<ApiResponse<Item[]>>(this.apiUrl, { params });
  }

  getItemById(id: string): Observable<ApiResponse<Item>> {
    return this.http.get<ApiResponse<Item>>(`${this.apiUrl}/${id}`);
  }

  getItemByCode(code: string): Observable<ApiResponse<Item>> {
    return this.http.get<ApiResponse<Item>>(`${this.apiUrl}/code/${code}`);
  }

  getItemByBarcode(barcode: string): Observable<ApiResponse<Item>> {
    return this.http.get<ApiResponse<Item>>(`${this.apiUrl}/barcode/${barcode}`);
  }

  updateItem(id: string, itemData: Partial<Item>): Observable<ApiResponse<Item>> {
    return this.http.put<ApiResponse<Item>>(`${this.apiUrl}/${id}`, itemData);
  }

  deleteItem(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  toggleItemStatus(id: string): Observable<ApiResponse<Item>> {
    return this.http.patch<ApiResponse<Item>>(`${this.apiUrl}/${id}/toggle-status`, {});
  }

  getLowStockItems(): Observable<ApiResponse<Item[]>> {
    return this.http.get<ApiResponse<Item[]>>(`${this.apiUrl}/low-stock`);
  }

  getExpiringSoonItems(): Observable<ApiResponse<Item[]>> {
    return this.http.get<ApiResponse<Item[]>>(`${this.apiUrl}/expiring-soon`);
  }

  searchItems(query: string): Observable<ApiResponse<Item[]>> {
    const params = new HttpParams().set('search', query);
    return this.http.get<ApiResponse<Item[]>>(`${this.apiUrl}/search`, { params });
  }

  bulkImport(file: File): Observable<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/bulk-import`, formData);
  }

  exportItems(format: 'excel' | 'pdf' = 'excel'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.apiUrl}/export`, {
      params,
      responseType: 'blob'
    });
  }
}
