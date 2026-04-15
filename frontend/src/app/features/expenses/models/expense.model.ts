export interface Expense {
  _id: string;
  date: string;
  categoryId: ExpenseCategory | string;
  accountId: any;
  cashAccountId: any;
  amount: number;
  detail: string;
  dimensionId?: any;
  createdBy: any;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  _id: string;
  categoryName: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
