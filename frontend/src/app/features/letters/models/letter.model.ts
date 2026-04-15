export interface Letter {
  _id: string;
  date: string;
  letterType: 'Employment' | 'SupplierContract' | 'CustomerAgreement' | 'Other';
  accountId?: any;
  subject: string;
  content: string;
  attachmentPath?: string;
  status: 'Draft' | 'Final';
  createdBy: any;
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
