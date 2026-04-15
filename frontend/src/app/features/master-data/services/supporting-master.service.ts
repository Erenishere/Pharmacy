import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from './item-master.service';

// Warehouse
export interface Warehouse {
  _id: string;
  code: string;
  name: string;
  address: string;
  townId?: string;
  inchargeUserId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Town
export interface Town {
  _id: string;
  name: string;
  region?: string;
  isActive: boolean;
}

// Area
export interface Area {
  _id: string;
  name: string;
  townId: string;
  isActive: boolean;
}

// Category
export interface Category {
  _id: string;
  name: string;
  parentCategoryId?: string;
  isActive: boolean;
}

// SubCategory
export interface SubCategory {
  _id: string;
  name: string;
  categoryId: string;
  isActive: boolean;
}

// Formula
export interface Formula {
  _id: string;
  name: string;
  composition?: string;
  isActive: boolean;
}

// FormulaSize
export interface FormulaSize {
  _id: string;
  formulaId: string;
  size: string;
  strength?: string;
  isActive: boolean;
}

// BusinessType
export interface BusinessType {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

// Salesman
export interface Salesman {
  _id: string;
  name: string;
  accountId?: string;
  warehouseId?: string | { _id: string; name: string; code: string };
  isActive: boolean;
}

// Transporter
export interface Transporter {
  _id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  isActive: boolean;
}

// ClaimAccount
export interface ClaimAccount {
  _id: string;
  name: string;
  createdAt: string;
  isActive: boolean;
}

// Dimension
export interface Dimension {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

// AccountHead
export interface AccountHead {
  _id: string;
  name: string;
  code: string;
  type: string;
  parentHeadId?: string;
  isActive: boolean;
}

// Scheme
export interface Scheme {
  _id: string;
  name: string;
  companyId?: string;
  description?: string;
  isActive: boolean;
}

// CustomerType
export interface CustomerType {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

// Company
export interface SupportingCompany {
  _id: string;
  code: string;
  name: string;
  groupType?: string;
  isActive: boolean;
}

// CompanyGroup
export interface CompanyGroup {
  _id: string;
  name: string;
  companyId: string | { _id: string; name: string };
  isActive: boolean;
}

// Designation
export interface Designation {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SupportingMasterService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Warehouse Methods
  createWarehouse(data: Partial<Warehouse>): Observable<ApiResponse<Warehouse>> {
    return this.http.post<ApiResponse<Warehouse>>(`${this.baseUrl}/warehouses`, data);
  }

  getWarehouses(filters?: any): Observable<ApiResponse<Warehouse[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<Warehouse[]>>(`${this.baseUrl}/warehouses`, { params });
  }

  getWarehouseById(id: string): Observable<ApiResponse<Warehouse>> {
    return this.http.get<ApiResponse<Warehouse>>(`${this.baseUrl}/warehouses/${id}`);
  }

  updateWarehouse(id: string, data: Partial<Warehouse>): Observable<ApiResponse<Warehouse>> {
    return this.http.put<ApiResponse<Warehouse>>(`${this.baseUrl}/warehouses/${id}`, data);
  }

  deleteWarehouse(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/warehouses/${id}`);
  }

  // Town Methods
  createTown(data: Partial<Town>): Observable<ApiResponse<Town>> {
    return this.http.post<ApiResponse<Town>>(`${this.baseUrl}/towns`, data);
  }

  getTowns(filters?: any): Observable<ApiResponse<Town[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<Town[]>>(`${this.baseUrl}/towns`, { params });
  }

  getTownById(id: string): Observable<ApiResponse<Town>> {
    return this.http.get<ApiResponse<Town>>(`${this.baseUrl}/towns/${id}`);
  }

  updateTown(id: string, data: Partial<Town>): Observable<ApiResponse<Town>> {
    return this.http.put<ApiResponse<Town>>(`${this.baseUrl}/towns/${id}`, data);
  }

  deleteTown(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/towns/${id}`);
  }

  // Area Methods
  createArea(data: Partial<Area>): Observable<ApiResponse<Area>> {
    return this.http.post<ApiResponse<Area>>(`${this.baseUrl}/areas`, data);
  }

  getAreas(filters?: any): Observable<ApiResponse<Area[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<Area[]>>(`${this.baseUrl}/areas`, { params });
  }

  getAreasByTown(townId: string): Observable<ApiResponse<Area[]>> {
    return this.http.get<ApiResponse<Area[]>>(`${this.baseUrl}/areas/town/${townId}`);
  }

  updateArea(id: string, data: Partial<Area>): Observable<ApiResponse<Area>> {
    return this.http.put<ApiResponse<Area>>(`${this.baseUrl}/areas/${id}`, data);
  }

  deleteArea(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/areas/${id}`);
  }

  // Category Methods
  createCategory(data: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.http.post<ApiResponse<Category>>(`${this.baseUrl}/categories`, data);
  }

  getCategories(filters?: any): Observable<ApiResponse<Category[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<Category[]>>(`${this.baseUrl}/categories`, { params });
  }

  getCategoryById(id: string): Observable<ApiResponse<Category>> {
    return this.http.get<ApiResponse<Category>>(`${this.baseUrl}/categories/${id}`);
  }

  updateCategory(id: string, data: Partial<Category>): Observable<ApiResponse<Category>> {
    return this.http.put<ApiResponse<Category>>(`${this.baseUrl}/categories/${id}`, data);
  }

  deleteCategory(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/categories/${id}`);
  }

  // SubCategory Methods
  createSubCategory(data: Partial<SubCategory>): Observable<ApiResponse<SubCategory>> {
    return this.http.post<ApiResponse<SubCategory>>(`${this.baseUrl}/subcategories`, data);
  }

  getSubCategories(filters?: any): Observable<ApiResponse<SubCategory[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<SubCategory[]>>(`${this.baseUrl}/subcategories`, { params });
  }

  getSubCategoriesByCategory(categoryId: string): Observable<ApiResponse<SubCategory[]>> {
    return this.http.get<ApiResponse<SubCategory[]>>(`${this.baseUrl}/subcategories/category/${categoryId}`);
  }

  updateSubCategory(id: string, data: Partial<SubCategory>): Observable<ApiResponse<SubCategory>> {
    return this.http.put<ApiResponse<SubCategory>>(`${this.baseUrl}/subcategories/${id}`, data);
  }

  deleteSubCategory(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/subcategories/${id}`);
  }

  // Formula Methods
  createFormula(data: Partial<Formula>): Observable<ApiResponse<Formula>> {
    return this.http.post<ApiResponse<Formula>>(`${this.baseUrl}/formulas`, data);
  }

  getFormulas(filters?: any): Observable<ApiResponse<Formula[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<Formula[]>>(`${this.baseUrl}/formulas`, { params });
  }

  getFormulaById(id: string): Observable<ApiResponse<Formula>> {
    return this.http.get<ApiResponse<Formula>>(`${this.baseUrl}/formulas/${id}`);
  }

  updateFormula(id: string, data: Partial<Formula>): Observable<ApiResponse<Formula>> {
    return this.http.put<ApiResponse<Formula>>(`${this.baseUrl}/formulas/${id}`, data);
  }

  deleteFormula(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/formulas/${id}`);
  }

  // FormulaSize Methods
  createFormulaSize(data: Partial<FormulaSize>): Observable<ApiResponse<FormulaSize>> {
    return this.http.post<ApiResponse<FormulaSize>>(`${this.baseUrl}/formula-sizes`, data);
  }

  getFormulaSizes(filters?: any): Observable<ApiResponse<FormulaSize[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<FormulaSize[]>>(`${this.baseUrl}/formula-sizes`, { params });
  }

  getFormulaSizesByFormula(formulaId: string): Observable<ApiResponse<FormulaSize[]>> {
    return this.http.get<ApiResponse<FormulaSize[]>>(`${this.baseUrl}/formula-sizes/formula/${formulaId}`);
  }

  updateFormulaSize(id: string, data: Partial<FormulaSize>): Observable<ApiResponse<FormulaSize>> {
    return this.http.put<ApiResponse<FormulaSize>>(`${this.baseUrl}/formula-sizes/${id}`, data);
  }

  deleteFormulaSize(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/formula-sizes/${id}`);
  }

  // BusinessType Methods
  createBusinessType(data: Partial<BusinessType>): Observable<ApiResponse<BusinessType>> {
    return this.http.post<ApiResponse<BusinessType>>(`${this.baseUrl}/business-types`, data);
  }

  getBusinessTypes(filters?: any): Observable<ApiResponse<BusinessType[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<BusinessType[]>>(`${this.baseUrl}/business-types`, { params });
  }

  getBusinessTypeById(id: string): Observable<ApiResponse<BusinessType>> {
    return this.http.get<ApiResponse<BusinessType>>(`${this.baseUrl}/business-types/${id}`);
  }

  updateBusinessType(id: string, data: Partial<BusinessType>): Observable<ApiResponse<BusinessType>> {
    return this.http.put<ApiResponse<BusinessType>>(`${this.baseUrl}/business-types/${id}`, data);
  }

  deleteBusinessType(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/business-types/${id}`);
  }

  // Salesman Methods
  createSalesman(data: Partial<Salesman>): Observable<ApiResponse<Salesman>> {
    return this.http.post<ApiResponse<Salesman>>(`${this.baseUrl}/salesmen`, data);
  }

  getSalesmen(filters?: any): Observable<ApiResponse<Salesman[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<Salesman[]>>(`${this.baseUrl}/salesmen`, { params });
  }

  getSalesmanById(id: string): Observable<ApiResponse<Salesman>> {
    return this.http.get<ApiResponse<Salesman>>(`${this.baseUrl}/salesmen/${id}`);
  }

  updateSalesman(id: string, data: Partial<Salesman>): Observable<ApiResponse<Salesman>> {
    return this.http.put<ApiResponse<Salesman>>(`${this.baseUrl}/salesmen/${id}`, data);
  }

  deleteSalesman(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/salesmen/${id}`);
  }

  toggleSalesmanStatus(id: string): Observable<ApiResponse<Salesman>> {
    return this.http.patch<ApiResponse<Salesman>>(`${this.baseUrl}/salesmen/${id}/status`, {});
  }

  // Transporter Methods
  createTransporter(data: Partial<Transporter>): Observable<ApiResponse<Transporter>> {
    return this.http.post<ApiResponse<Transporter>>(`${this.baseUrl}/transporters`, data);
  }

  getTransporters(filters?: any): Observable<ApiResponse<Transporter[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<Transporter[]>>(`${this.baseUrl}/transporters`, { params });
  }

  getTransporterById(id: string): Observable<ApiResponse<Transporter>> {
    return this.http.get<ApiResponse<Transporter>>(`${this.baseUrl}/transporters/${id}`);
  }

  updateTransporter(id: string, data: Partial<Transporter>): Observable<ApiResponse<Transporter>> {
    return this.http.put<ApiResponse<Transporter>>(`${this.baseUrl}/transporters/${id}`, data);
  }

  deleteTransporter(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/transporters/${id}`);
  }

  // ClaimAccount Methods
  createClaimAccount(data: Partial<ClaimAccount>): Observable<ApiResponse<ClaimAccount>> {
    return this.http.post<ApiResponse<ClaimAccount>>(`${this.baseUrl}/claim-accounts`, data);
  }

  getClaimAccounts(filters?: any): Observable<ApiResponse<ClaimAccount[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<ClaimAccount[]>>(`${this.baseUrl}/claim-accounts`, { params });
  }

  getClaimAccountById(id: string): Observable<ApiResponse<ClaimAccount>> {
    return this.http.get<ApiResponse<ClaimAccount>>(`${this.baseUrl}/claim-accounts/${id}`);
  }

  updateClaimAccount(id: string, data: Partial<ClaimAccount>): Observable<ApiResponse<ClaimAccount>> {
    return this.http.put<ApiResponse<ClaimAccount>>(`${this.baseUrl}/claim-accounts/${id}`, data);
  }

  deleteClaimAccount(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/claim-accounts/${id}`);
  }

  toggleClaimAccountStatus(id: string): Observable<ApiResponse<ClaimAccount>> {
    return this.http.patch<ApiResponse<ClaimAccount>>(`${this.baseUrl}/claim-accounts/${id}/status`, {});
  }

  // Dimension Methods
  createDimension(data: Partial<Dimension>): Observable<ApiResponse<Dimension>> {
    return this.http.post<ApiResponse<Dimension>>(`${this.baseUrl}/dimensions`, data);
  }

  getDimensions(filters?: any): Observable<ApiResponse<Dimension[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<Dimension[]>>(`${this.baseUrl}/dimensions`, { params });
  }

  getDimensionById(id: string): Observable<ApiResponse<Dimension>> {
    return this.http.get<ApiResponse<Dimension>>(`${this.baseUrl}/dimensions/${id}`);
  }

  updateDimension(id: string, data: Partial<Dimension>): Observable<ApiResponse<Dimension>> {
    return this.http.put<ApiResponse<Dimension>>(`${this.baseUrl}/dimensions/${id}`, data);
  }

  deleteDimension(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/dimensions/${id}`);
  }

  // AccountHead Methods
  createAccountHead(data: Partial<AccountHead>): Observable<ApiResponse<AccountHead>> {
    return this.http.post<ApiResponse<AccountHead>>(`${this.baseUrl}/account-heads`, data);
  }

  getAccountHeads(filters?: any): Observable<ApiResponse<AccountHead[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<AccountHead[]>>(`${this.baseUrl}/account-heads`, { params });
  }

  updateAccountHead(id: string, data: Partial<AccountHead>): Observable<ApiResponse<AccountHead>> {
    return this.http.put<ApiResponse<AccountHead>>(`${this.baseUrl}/account-heads/${id}`, data);
  }

  // Scheme Methods
  createScheme(data: Partial<Scheme>): Observable<ApiResponse<Scheme>> {
    return this.http.post<ApiResponse<Scheme>>(`${this.baseUrl}/schemes`, data);
  }

  getSchemes(filters?: any): Observable<ApiResponse<Scheme[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<Scheme[]>>(`${this.baseUrl}/schemes`, { params });
  }

  updateScheme(id: string, data: Partial<Scheme>): Observable<ApiResponse<Scheme>> {
    return this.http.put<ApiResponse<Scheme>>(`${this.baseUrl}/schemes/${id}`, data);
  }

  // CustomerType Methods
  getCustomerTypes(): Observable<ApiResponse<CustomerType[]>> {
    return this.http.get<ApiResponse<CustomerType[]>>(`${this.baseUrl}/customer-types`);
  }

  createCustomerType(data: Partial<CustomerType>): Observable<ApiResponse<CustomerType>> {
    return this.http.post<ApiResponse<CustomerType>>(`${this.baseUrl}/customer-types`, data);
  }

  updateCustomerType(id: string, data: Partial<CustomerType>): Observable<ApiResponse<CustomerType>> {
    return this.http.put<ApiResponse<CustomerType>>(`${this.baseUrl}/customer-types/${id}`, data);
  }

  // Designation Methods
  getDesignations(): Observable<ApiResponse<Designation[]>> {
    return this.http.get<ApiResponse<Designation[]>>(`${this.baseUrl}/designations`);
  }

  createDesignation(data: Partial<Designation>): Observable<ApiResponse<Designation>> {
    return this.http.post<ApiResponse<Designation>>(`${this.baseUrl}/designations`, data);
  }

  updateDesignation(id: string, data: Partial<Designation>): Observable<ApiResponse<Designation>> {
    return this.http.put<ApiResponse<Designation>>(`${this.baseUrl}/designations/${id}`, data);
  }

  // Company Methods
  getCompanies(filters?: any): Observable<ApiResponse<SupportingCompany[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<SupportingCompany[]>>(`${this.baseUrl}/companies`, { params });
  }

  createCompany(data: Partial<SupportingCompany>): Observable<ApiResponse<SupportingCompany>> {
    return this.http.post<ApiResponse<SupportingCompany>>(`${this.baseUrl}/companies`, data);
  }

  updateCompany(id: string, data: Partial<SupportingCompany>): Observable<ApiResponse<SupportingCompany>> {
    return this.http.put<ApiResponse<SupportingCompany>>(`${this.baseUrl}/companies/${id}`, data);
  }

  deleteCompany(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/companies/${id}`);
  }

  // CompanyGroup Methods
  getCompanyGroups(filters?: any): Observable<ApiResponse<CompanyGroup[]>> {
    let params = new HttpParams();
    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params = params.set(key, filters[key].toString());
        }
      });
    }
    return this.http.get<ApiResponse<CompanyGroup[]>>(`${this.baseUrl}/company-groups`, { params });
  }

  getCompanyGroupsByCompany(companyId: string): Observable<ApiResponse<CompanyGroup[]>> {
    return this.http.get<ApiResponse<CompanyGroup[]>>(`${this.baseUrl}/company-groups/company/${companyId}`);
  }

  createCompanyGroup(data: Partial<CompanyGroup>): Observable<ApiResponse<CompanyGroup>> {
    return this.http.post<ApiResponse<CompanyGroup>>(`${this.baseUrl}/company-groups`, data);
  }

  updateCompanyGroup(id: string, data: Partial<CompanyGroup>): Observable<ApiResponse<CompanyGroup>> {
    return this.http.put<ApiResponse<CompanyGroup>>(`${this.baseUrl}/company-groups/${id}`, data);
  }

  deleteCompanyGroup(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/company-groups/${id}`);
  }
}
