import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { SalesReturnsService, SalesReturn, ReturnItem, CreditNote } from './sales-returns.service';

describe('SalesReturnsService', () => {
  let service: SalesReturnsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SalesReturnsService]
    });

    service = TestBed.inject(SalesReturnsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getReturns', () => {
    it('should fetch returns with query parameters', () => {
      const mockParams = { status: 'approved', customerId: 'CUST001', invoiceId: 'INV001', page: 1, limit: 10 };
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'RET001',
            returnNumber: 'RET-2024-001',
            invoiceId: 'INV001',
            invoiceNumber: 'INV-2024-001',
            customerId: 'CUST001',
            customerName: 'Medical Store A',
            returnDate: '2024-03-20',
            status: 'approved',
            items: [
              {
                itemId: 'ITEM001',
                itemName: 'Paracetamol 500mg',
                quantity: 10,
                unitPrice: 5.50,
                returnReason: 'damaged',
                condition: 'damaged',
                creditPercent: 80,
                creditAmount: 44.00,
                taxCreditAmount: 6.60,
                totalCredit: 50.60
              }
            ],
            subtotal: 55.00,
            totalCredit: 44.00,
            taxCredit: 6.60,
            netCredit: 50.60,
            processingFees: 2.53,
            finalCreditAmount: 48.07,
            createdBy: 'salesman1'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      service.getReturns(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBeInstanceOf(Array);
        expect(response.data[0].returnNumber).toBe('RET-2024-001');
        expect(response.data[0].status).toBe('approved');
        expect(response.data[0].finalCreditAmount).toBe(48.07);
        expect(response.pagination).toBeDefined();
      });

      const req = httpMock.expectOne(req => req.url.includes('/returns'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('status')).toBe('approved');
      expect(req.request.params.get('customerId')).toBe('CUST001');
      expect(req.request.params.get('invoiceId')).toBe('INV001');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockResponse);
    });
  });

  describe('getReturnById', () => {
    it('should fetch a single return by ID', () => {
      const mockReturn: SalesReturn = {
        id: 'RET001',
        returnNumber: 'RET-2024-001',
        invoiceId: 'INV001',
        invoiceNumber: 'INV-2024-001',
        customerId: 'CUST001',
        customerName: 'Medical Store A',
        customerEmail: 'contact@medicalstore.com',
        customerPhone: '+92-300-1234567',
        customerAddress: '123 Main Street, Lahore',
        returnDate: '2024-03-20',
        status: 'completed',
        items: [
          {
            itemId: 'ITEM001',
            itemName: 'Paracetamol 500mg',
            quantity: 10,
            unitPrice: 5.50,
            returnReason: 'damaged',
            condition: 'damaged',
            creditPercent: 80,
            creditAmount: 44.00,
            taxCreditAmount: 6.60,
            totalCredit: 50.60,
            batchNumber: 'BAT001',
            expiryDate: '2025-03-20',
            packSize: '100 tablets'
          }
        ],
        subtotal: 55.00,
        totalCredit: 44.00,
        taxCredit: 6.60,
        netCredit: 50.60,
        processingFees: 2.53,
        finalCreditAmount: 48.07,
        notes: 'Items were damaged during transit',
        referenceNumber: 'REF-RET-2024-001',
        createdBy: 'salesman1',
        approvedBy: 'manager',
        approvedDate: '2024-03-20T10:00:00Z',
        processedBy: 'warehouse_manager',
        processedDate: '2024-03-20T14:00:00Z',
        completedBy: 'accountant',
        completedDate: '2024-03-21T09:00:00Z',
        creditNoteId: 'CN001',
        creditNoteNumber: 'CN-2024-001',
        paymentMethod: 'credit_note',
        refundAmount: 48.07,
        refundDate: '2024-03-21T09:00:00Z'
      };

      const mockResponse = { success: true, data: mockReturn };

      service.getReturnById('RET001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('RET001');
        expect(response.data.items).toHaveLength(1);
        expect(response.data.status).toBe('completed');
        expect(response.data.finalCreditAmount).toBe(48.07);
        expect(response.data.customerEmail).toBe('contact@medicalstore.com');
        expect(response.data.paymentMethod).toBe('credit_note');
        expect(response.data.creditNoteId).toBe('CN001');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/RET001`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('createReturn', () => {
    it('should create a new sales return', () => {
      const newReturn = {
        invoiceId: 'INV001',
        customerId: 'CUST001',
        items: [
          {
            itemId: 'ITEM001',
            quantity: 10,
            unitPrice: 5.50,
            returnReason: 'damaged',
            condition: 'damaged',
            creditPercent: 80
          }
        ],
        notes: 'Items were damaged during transit'
      };

      const mockCreatedReturn: SalesReturn = {
        ...newReturn,
        id: 'RET002',
        returnNumber: 'RET-2024-002',
        invoiceNumber: 'INV-2024-001',
        customerName: 'Medical Store A',
        returnDate: '2024-03-20',
        status: 'draft',
        subtotal: 55.00,
        totalCredit: 44.00,
        taxCredit: 6.60,
        netCredit: 50.60,
        processingFees: 2.53,
        finalCreditAmount: 48.07,
        createdBy: 'salesman1'
      };

      const mockResponse = { success: true, data: mockCreatedReturn };

      service.createReturn(newReturn).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('RET002');
        expect(response.data.status).toBe('draft');
        expect(response.data.finalCreditAmount).toBe(48.07);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newReturn);
      req.flush(mockResponse);
    });
  });

  describe('submitReturn', () => {
    it('should submit a return for approval', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'RET001',
          status: 'pending',
          submittedAt: '2024-03-20T10:00:00Z'
        }
      };

      service.submitReturn('RET001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('pending');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/RET001/submit`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('approveReturn', () => {
    it('should approve a return with credit calculations', () => {
      const approvalData = {
        approvedBy: 'manager',
        notes: 'Approved with 80% credit due to damage',
        items: [
          {
            itemId: 'ITEM001',
            approvedQuantity: 10,
            creditPercent: 80,
            returnReason: 'damaged'
          }
        ]
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'RET001',
          status: 'approved',
          approvedBy: 'manager',
          approvedDate: '2024-03-20T11:00:00Z',
          totalCredit: 44.00,
          taxCredit: 6.60,
          netCredit: 50.60,
          processingFees: 2.53,
          finalCreditAmount: 48.07
        }
      };

      service.approveReturn('RET001', approvalData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('approved');
        expect(response.data.approvedBy).toBe('manager');
        expect(response.data.finalCreditAmount).toBe(48.07);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/RET001/approve`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(approvalData);
      req.flush(mockResponse);
    });
  });

  describe('processReturn', () => {
    it('should process an approved return with stock return', () => {
      const processData = {
        processedBy: 'warehouse_manager',
        items: [
          {
            itemId: 'ITEM001',
            quantity: 10,
            batchNumber: 'BAT001',
            condition: 'damaged',
            location: 'Damaged Goods Warehouse'
          }
        ],
        notes: 'Items returned to damaged goods section'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'RET001',
          status: 'processing',
          processedBy: 'warehouse_manager',
          processedDate: '2024-03-20T14:00:00Z'
        }
      };

      service.processReturn('RET001', processData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('processing');
        expect(response.data.processedBy).toBe('warehouse_manager');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/RET001/process`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(processData);
      req.flush(mockResponse);
    });
  });

  describe('completeReturn', () => {
    it('should complete return with credit note generation', () => {
      const completionData = {
        completedBy: 'accountant',
        paymentMethod: 'credit_note',
        creditNoteAmount: 48.07,
        notes: 'Credit note issued for future purchases'
      };

      const mockCreditNote: CreditNote = {
        id: 'CN001',
        creditNoteNumber: 'CN-2024-001',
        returnId: 'RET001',
        customerId: 'CUST001',
        customerName: 'Medical Store A',
        amount: 48.07,
        issuedDate: '2024-03-21',
        expiryDate: '2025-03-21',
        status: 'active',
        usedAmount: 0,
        balanceAmount: 48.07,
        notes: 'Credit note for returned damaged goods'
      };

      const mockResponse = {
        success: true,
        data: {
          return: {
            id: 'RET001',
            status: 'completed',
            completedBy: 'accountant',
            completedDate: '2024-03-21T09:00:00Z',
            paymentMethod: 'credit_note',
            creditNoteId: 'CN001',
            creditNoteNumber: 'CN-2024-001'
          },
          creditNote: mockCreditNote
        }
      };

      service.completeReturn('RET001', completionData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.return.status).toBe('completed');
        expect(response.data.return.paymentMethod).toBe('credit_note');
        expect(response.data.creditNote).toBeDefined();
        expect(response.data.creditNote.amount).toBe(48.07);
        expect(response.data.creditNote.status).toBe('active');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/RET001/complete`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(completionData);
      req.flush(mockResponse);
    });

    it('should complete return with refund', () => {
      const completionData = {
        completedBy: 'accountant',
        paymentMethod: 'refund',
        refundAmount: 48.07,
        notes: 'Refund processed via bank transfer'
      };

      const mockResponse = {
        success: true,
        data: {
          return: {
            id: 'RET001',
            status: 'completed',
            completedBy: 'accountant',
            completedDate: '2024-03-21T09:00:00Z',
            paymentMethod: 'refund',
            refundAmount: 48.07,
            refundDate: '2024-03-21T09:00:00Z'
          }
        }
      };

      service.completeReturn('RET001', completionData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.return.status).toBe('completed');
        expect(response.data.return.paymentMethod).toBe('refund');
        expect(response.data.return.refundAmount).toBe(48.07);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/RET001/complete`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(completionData);
      req.flush(mockResponse);
    });
  });

  describe('getCreditNotes', () => {
    it('should fetch credit notes for a customer', () => {
      const mockCreditNotes: CreditNote[] = [
        {
          id: 'CN001',
          creditNoteNumber: 'CN-2024-001',
          returnId: 'RET001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          amount: 48.07,
          issuedDate: '2024-03-21',
          expiryDate: '2025-03-21',
          status: 'active',
          usedAmount: 0,
          balanceAmount: 48.07
        },
        {
          id: 'CN002',
          creditNoteNumber: 'CN-2024-002',
          returnId: 'RET002',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          amount: 25.30,
          issuedDate: '2024-03-22',
          expiryDate: '2025-03-22',
          status: 'used',
          usedAmount: 25.30,
          balanceAmount: 0
        }
      ];

      const mockResponse = { success: true, data: mockCreditNotes };

      service.getCreditNotes('CUST001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(response.data[0].amount).toBe(48.07);
        expect(response.data[0].status).toBe('active');
        expect(response.data[1].status).toBe('used');
        expect(response.data[1].balanceAmount).toBe(0);
      });

      const req = httpMock.expectOne(req => req.url.includes('/credit-notes'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('customerId')).toBe('CUST001');
      req.flush(mockResponse);
    });
  });

  describe('applyCreditNote', () => {
    it('should apply credit note to an invoice', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'CN001',
          usedAmount: 30.00,
          balanceAmount: 18.07,
          status: 'active'
        }
      };

      service.applyCreditNote('CN001', 'INV002', 30.00).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.usedAmount).toBe(30.00);
        expect(response.data.balanceAmount).toBe(18.07);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/credit-notes/CN001/apply`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ invoiceId: 'INV002', amount: 30.00 });
      req.flush(mockResponse);
    });
  });

  describe('createRecoveryRequest', () => {
    it('should create a recovery request', () => {
      const recoveryData = {
        recoveryType: 'refund',
        amount: 48.07,
        reason: 'Customer requested immediate refund',
        priority: 'urgent',
        notes: 'Process refund within 24 hours'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'REC001',
          returnId: 'RET001',
          recoveryType: 'refund',
          amount: 48.07,
          status: 'pending',
          priority: 'urgent'
        }
      };

      service.createRecoveryRequest('RET001', recoveryData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.recoveryType).toBe('refund');
        expect(response.data.priority).toBe('urgent');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/RET001/recovery`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(recoveryData);
      req.flush(mockResponse);
    });
  });

  describe('calculateReturnCredit', () => {
    it('should calculate total return credit correctly', () => {
      const items: ReturnItem[] = [
        { itemId: '1', itemName: 'Item 1', quantity: 10, unitPrice: 5.00, returnReason: 'damaged', condition: 'damaged', creditPercent: 80, creditAmount: 40.00, taxCreditAmount: 6.00, totalCredit: 46.00 },
        { itemId: '2', itemName: 'Item 2', quantity: 5, unitPrice: 8.00, returnReason: 'wrong_item', condition: 'good', creditPercent: 100, creditAmount: 40.00, taxCreditAmount: 6.00, totalCredit: 46.00 }
      ];

      const totalCredit = service.calculateReturnCredit(items);
      expect(totalCredit).toBe(92.00);
    });
  });

  describe('calculateItemCredit', () => {
    it('should calculate item credit with tax correctly', () => {
      const result = service.calculateItemCredit(10, 5.00, 80, 15);

      expect(result.quantity).toBe(10);
      expect(result.unitPrice).toBe(5.00);
      expect(result.creditPercent).toBe(80);
      expect(result.creditAmount).toBe(40.00); // 10 * 5 * 0.8
      expect(result.taxCreditAmount).toBe(6.00); // 40 * 0.15
      expect(result.totalCredit).toBe(46.00); // 40 + 6
    });
  });

  describe('validateReturn', () => {
    it('should validate a correct return', () => {
      const validReturn = {
        invoiceId: 'INV001',
        customerId: 'CUST001',
        items: [
          { itemId: 'ITEM001', quantity: 10, unitPrice: 5.50, returnReason: 'damaged', condition: 'damaged', creditPercent: 80 }
        ]
      };

      const result = service.validateReturn(validReturn);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify validation errors', () => {
      const invalidReturn = {
        // Missing invoiceId and customerId
        items: [
          { itemId: '', quantity: -5, unitPrice: 0, returnReason: 'damaged', condition: 'damaged', creditPercent: 150 }, // Invalid item
          { quantity: 10, unitPrice: 5.50, returnReason: '', condition: 'good', creditPercent: 80 } // Missing itemId and returnReason
        ]
        // Missing items array initially, but then invalid items
      };

      const result = service.validateReturn(invalidReturn);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invoice is required');
      expect(result.errors).toContain('Customer is required');
      expect(result.errors).toContain('Item 1: Item is required');
      expect(result.errors).toContain('Item 1: Quantity must be greater than 0');
      expect(result.errors).toContain('Item 1: Unit price must be greater than 0');
      expect(result.errors).toContain('Item 1: Credit percentage must be between 0 and 100');
      expect(result.errors).toContain('Item 2: Item is required');
      expect(result.errors).toContain('Item 2: Return reason is required');
    });
  });

  describe('getReturnStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(service.getReturnStatusColor('draft')).toBe('#9E9E9E');
      expect(service.getReturnStatusColor('pending')).toBe('#FF9800');
      expect(service.getReturnStatusColor('approved')).toBe('#2196F3');
      expect(service.getReturnStatusColor('processing')).toBe('#9C27B0');
      expect(service.getReturnStatusColor('completed')).toBe('#4CAF50');
      expect(service.getReturnStatusColor('rejected')).toBe('#F44336');
      expect(service.getReturnStatusColor('cancelled')).toBe('#666');
    });
  });

  describe('getReturnStatusText', () => {
    it('should return correct text for each status', () => {
      expect(service.getReturnStatusText('draft')).toBe('Draft');
      expect(service.getReturnStatusText('pending')).toBe('Pending Approval');
      expect(service.getReturnStatusText('approved')).toBe('Approved');
      expect(service.getReturnStatusText('processing')).toBe('Processing');
      expect(service.getReturnStatusText('completed')).toBe('Completed');
      expect(service.getReturnStatusText('rejected')).toBe('Rejected');
      expect(service.getReturnStatusText('cancelled')).toBe('Cancelled');
    });
  });

  describe('getReturnReasonText', () => {
    it('should return correct text for each return reason', () => {
      expect(service.getReturnReasonText('damaged')).toBe('Damaged');
      expect(service.getReturnReasonText('expired')).toBe('Expired');
      expect(service.getReturnReasonText('wrong_item')).toBe('Wrong Item');
      expect(service.getReturnReasonText('customer_request')).toBe('Customer Request');
      expect(service.getReturnReasonText('quality_issue')).toBe('Quality Issue');
      expect(service.getReturnReasonText('other')).toBe('Other');
    });
  });

  describe('getConditionText', () => {
    it('should return correct text for each condition', () => {
      expect(service.getConditionText('good')).toBe('Good');
      expect(service.getConditionText('damaged')).toBe('Damaged');
      expect(service.getConditionText('expired')).toBe('Expired');
    });
  });

  describe('isReturnEligible', () => {
    it('should return true for eligible returns', () => {
      const recentInvoiceDate = '2024-03-15'; // Within 30 days
      expect(service.isReturnEligible(recentInvoiceDate, 30)).toBe(true);
    });

    it('should return false for ineligible returns', () => {
      const oldInvoiceDate = '2024-01-01'; // More than 30 days ago
      expect(service.isReturnEligible(oldInvoiceDate, 30)).toBe(false);
    });
  });

  describe('calculateProcessingFees', () => {
    it('should calculate processing fees correctly', () => {
      expect(service.calculateProcessingFees(100, 5)).toBe(5.00);
      expect(service.calculateProcessingFees(500, 8)).toBe(40.00);
      expect(service.calculateProcessingFees(0, 10)).toBe(0);
    });
  });

  describe('returnItemsToStock', () => {
    it('should return items to stock', () => {
      const items = [
        { itemId: 'ITEM001', quantity: 10, batchNumber: 'BAT001', condition: 'good', location: 'Main Warehouse' },
        { itemId: 'ITEM002', quantity: 5, batchNumber: 'BAT002', condition: 'damaged', location: 'Damaged Goods' }
      ];

      const mockResponse = { success: true, data: null };

      service.returnItemsToStock('RET001', items).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/RET001/return-to-stock`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ items });
      req.flush(mockResponse);
    });
  });

  describe('exportReturns', () => {
    it('should export returns in specified format', () => {
      const exportParams = {
        format: 'excel' as const,
        status: 'completed',
        customerId: 'CUST001',
        startDate: '2024-03-01',
        endDate: '2024-03-31'
      };

      const mockBlob = new Blob(['mock,excel,data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      service.exportReturns(exportParams).subscribe(response => {
        expect(response).toBe(mockBlob);
      });

      const req = httpMock.expectOne(req => req.url.includes('/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('format')).toBe('excel');
      expect(req.request.params.get('status')).toBe('completed');
      expect(req.request.params.get('customerId')).toBe('CUST001');
      expect(req.request.params.get('startDate')).toBe('2024-03-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      req.flush(mockResponse);
    });
  });
});
