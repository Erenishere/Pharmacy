import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PDCRecord {
  _id: string;
  receiptNumber: string;
  receiptDate: string;
  customerId: { _id: string; name: string; phone?: string };
  amount: number;
  paymentMethod: string;
  bankDetails: {
    bankName: string;
    accountNumber?: string;
    chequeNumber: string;
    chequeDate: string;
  };
  chequeStatus: 'pending' | 'cleared' | 'bounced';
  bounceReason?: string;
  status: string;
  clearedDate?: string;
  description?: string;
  invoicePayments?: { invoiceNumber: string; paidAmount: number }[];
  createdBy?: { username: string };
}

@Injectable({ providedIn: 'root' })
export class PdcService {
  private base = `${environment.apiUrl}/pdc`;

  constructor(private http: HttpClient) {}

  getPendingPDCs(): Observable<any> {
    return this.http.get<any>(`${this.base}/pending`);
  }

  clearPDC(id: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/${id}/clear`, {});
  }

  bouncePDC(id: string, reason: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/${id}/bounce`, { reason });
  }
}
