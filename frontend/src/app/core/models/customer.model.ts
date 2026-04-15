// Enums
export enum CustomerType {
    REGULAR = 'regular',
    WHOLESALE = 'wholesale',
    RETAIL = 'retail',
    DISTRIBUTOR = 'distributor'
}

export enum AccountType {
    CUSTOMER = 'customer',
    SUPPLIER = 'supplier',
    EMPLOYEE = 'employee',
    INVESTOR = 'investor',
    BOTH = 'both',
    ACCOUNT_MANAGER = 'account_manager',
    SUB_ACCOUNT = 'sub_account',
    EMPLOYEE_ACCOUNT = 'employee_account'
}

// Core Customer Interface
export interface Customer {
    _id: string;
    code: string;
    name: string;
    email?: string;
    phone?: string;
    phone1?: string;
    phone2?: string;
    address?: string;
    deliveryLocation?: string;
    type: CustomerType | string;
    accountType: AccountType | string;
    isActive: boolean;
    nameUrdu?: string;
    dimensionId?: any;
    townId?: any;
    areaId?: any;
    accountHeadId?: any;
    customerTypeId?: any;
    parentAccountId?: any;
    linkedAccountId?: any;
    routeId?: any;
    employeeAccountType?: string;
    creditLimit?: number;
    currentBalance?: number;
    assignedSalesmanId?: any;

    // Employee Biodata
    employeeBiodata?: {
        fatherName?: string;
        fatherNIC?: string;
        dateOfAppointment?: string;
        guarantorName?: string;
        guarantorNIC?: string;
        basicPay?: number;
        bloodGroup?: string;
        emergencyContact?: string;
        guarantorAddress?: string;
        guarantorPhone?: string;
        permanentAddress?: string;
        designationId?: any;
        experience?: string;
        salaryPosition?: string;
        proprietorName?: string;
        storeInchargeName?: string;
    };

    // Banking Info
    bankingInfo?: {
        bankName?: string;
        accountNumber?: string;
        branch?: string;
    };

    // Financial Info
    financialInfo?: {
        licenseNo?: string;
        ntn?: string;
        strn?: string;
        isNonFiler?: boolean;
        advanceTaxRate?: number;
        whtPercent?: number;
        advanceWhtPercent?: number;
    };

    // Business Details
    businessDetails?: {
        customerTypeId?: any;
        creditDaysLimit?: number;
        creditAmountLimit?: number;
        openingBalance?: number;
        balanceType?: 'debit' | 'credit' | '';
        assignedSalesmanId?: any;
        linkedAccountId?: any;
    };

    createdAt?: string;
    updatedAt?: string;
}

// Customer Management Request/Response Types
export interface CustomerCreateRequest {
    code: string;
    name: string;
    email?: string;
    phone?: string;
    phone1?: string;
    phone2?: string;
    address?: string;
    deliveryLocation?: string;
    type: CustomerType | string;
    accountType: AccountType | string;
    isActive?: boolean;
    creditLimit?: number;

    employeeBiodata?: any;
    bankingInfo?: any;
    financialInfo?: any;
}

export interface CustomerUpdateRequest {
    code?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    type?: CustomerType | string;
    isActive?: boolean;
    creditLimit?: number;
}

export interface CustomerListResponse {
    success: boolean;
    data: Customer[];
    pagination: {
        total?: number; // Fallback for mock data
        totalItems?: number; // Backend field name
        page: number;
        limit: number;
        pages: number;
    };
    message?: string;
    timestamp?: string;
}

export interface CustomerStatistics {
    total: number;
    active: number;
    inactive: number;
    deleted: number;
    byType: {
        [key: string]: number;
    };
    totalCreditLimit: number;
    totalCurrentBalance: number;
}

export interface CustomerFilters {
    page?: number;
    limit?: number;
    type?: CustomerType | string;
    isActive?: boolean;
    search?: string;
    includeDeleted?: boolean;
}

// Generic API Response
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}