import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { QuotationService, Quotation, QuotationItem, Customer } from './quotation.service';

describe('QuotationService', () => {
  let service: QuotationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [QuotationService]
    });

    service = TestBed.inject(QuotationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getQuotations', () => {
    it('should fetch quotations with query parameters', () => {
      const mockParams = { status: 'sent', customerId: 'CUST001', page: 1, limit: 10 };
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'Q001',
            quotationNumber: 'QT-2024-001',
            customerId: 'CUST001',
            customerName: 'Medical Store A',
            quotationDate: '2024-03-15',
            validUntil: '2024-03-30',
            status: 'sent',
            items: [
              {
                itemId: 'ITEM001',
                itemName: 'Paracetamol 500mg',
                quantity: 100,
                unitPrice: 5.50,
                discountPercent: 5,
                discountAmount: 27.50,
                totalPrice: 522.50
              }
            ],
            subtotal: 550.00,
            totalDiscount: 27.50,
            taxAmount: 78.75,
            totalAmount: 601.25,
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

      service.getQuotations(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBeInstanceOf(Array);
        expect(response.data[0].quotationNumber).toBe('QT-2024-001');
        expect(response.data[0].status).toBe('sent');
        expect(response.pagination).toBeDefined();
      });

      const req = httpMock.expectOne(req => req.url.includes('/quotations'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('status')).toBe('sent');
      expect(req.request.params.get('customerId')).toBe('CUST001');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockResponse);
    });
  });

  describe('getQuotationById', () => {
    it('should fetch a single quotation by ID', () => {
      const mockQuotation: Quotation = {
        id: 'Q001',
        quotationNumber: 'QT-2024-001',
        customerId: 'CUST001',
        customerName: 'Medical Store A',
        customerEmail: 'contact@medicalstore.com',
        customerPhone: '+92-300-1234567',
        quotationDate: '2024-03-15',
        validUntil: '2024-03-30',
        status: 'sent',
        items: [
          {
            itemId: 'ITEM001',
            itemName: 'Paracetamol 500mg',
            quantity: 100,
            unitPrice: 5.50,
            discountPercent: 5,
            discountAmount: 27.50,
            totalPrice: 522.50,
            notes: 'Popular pain relief medication'
          }
        ],
        subtotal: 550.00,
        totalDiscount: 27.50,
        taxAmount: 78.75,
        totalAmount: 601.25,
        notes: 'Special discount for bulk purchase',
        termsAndConditions: 'Payment within 30 days',
        createdBy: 'salesman1',
        sentBy: 'salesman1',
        sentDate: '2024-03-15T10:00:00Z'
      };

      const mockResponse = { success: true, data: mockQuotation };

      service.getQuotationById('Q001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('Q001');
        expect(response.data.items).toHaveLength(1);
        expect(response.data.sentBy).toBe('salesman1');
        expect(response.data.customerEmail).toBe('contact@medicalstore.com');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/Q001`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('createQuotation', () => {
    it('should create a new quotation', () => {
      const newQuotation = {
        customerId: 'CUST001',
        validUntil: '2024-03-30',
        items: [
          {
            itemId: 'ITEM001',
            quantity: 100,
            unitPrice: 5.50,
            discountPercent: 5
          }
        ],
        notes: 'Special discount for bulk purchase'
      };

      const mockCreatedQuotation: Quotation = {
        ...newQuotation,
        id: 'Q002',
        quotationNumber: 'QT-2024-002',
        customerName: 'Medical Store A',
        quotationDate: '2024-03-20',
        status: 'draft',
        subtotal: 550.00,
        totalDiscount: 27.50,
        taxAmount: 78.75,
        totalAmount: 601.25,
        createdBy: 'salesman1'
      };

      const mockResponse = { success: true, data: mockCreatedQuotation };

      service.createQuotation(newQuotation).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('Q002');
        expect(response.data.status).toBe('draft');
        expect(response.data.totalAmount).toBe(601.25);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newQuotation);
      req.flush(mockResponse);
    });
  });

  describe('sendQuotation', () => {
    it('should send quotation to customer', () => {
      const sendData = {
        sentBy: 'salesman1',
        emailSubject: 'Quotation for Medical Supplies',
        emailMessage: 'Please find attached quotation for your review.'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'Q001',
          status: 'sent',
          sentBy: 'salesman1',
          sentDate: '2024-03-20T14:00:00Z'
        }
      };

      service.sendQuotation('Q001', sendData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('sent');
        expect(response.data.sentBy).toBe('salesman1');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/Q001/send`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(sendData);
      req.flush(mockResponse);
    });
  });

  describe('approveQuotation', () => {
    it('should approve a quotation', () => {
      const approvalData = {
        approvedBy: 'customer_manager',
        notes: 'Approved for immediate purchase'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'Q001',
          status: 'approved',
          approvedBy: 'customer_manager',
          approvedDate: '2024-03-21T09:00:00Z'
        }
      };

      service.approveQuotation('Q001', approvalData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('approved');
        expect(response.data.approvedBy).toBe('customer_manager');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/Q001/approve`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(approvalData);
      req.flush(mockResponse);
    });
  });

  describe('convertToInvoice', () => {
    it('should convert approved quotation to invoice', () => {
      const invoiceData = {
        invoiceNumber: 'INV-2024-001',
        invoiceDate: '2024-03-21',
        dueDate: '2024-04-20',
        paymentTerms: 'Net 30',
        notes: 'Invoice generated from approved quotation'
      };

      const mockResponse = {
        success: true,
        data: {
          invoiceId: 'INV001',
          quotationId: 'Q001',
          totalAmount: 601.25,
          dueDate: '2024-04-20'
        }
      };

      service.convertToInvoice('Q001', invoiceData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.invoiceId).toBe('INV001');
        expect(response.data.quotationId).toBe('Q001');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/Q001/convert-to-invoice`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(invoiceData);
      req.flush(mockResponse);
    });
  });

  describe('convertToEOrder', () => {
    it('should convert approved quotation to e-order', () => {
      const eOrderData = {
        salesmanId: 'SALES001',
        deliveryDate: '2024-03-25',
        priority: 'normal' as const,
        notes: 'E-order created from approved quotation'
      };

      const mockResponse = {
        success: true,
        data: {
          eOrderId: 'EO001',
          quotationId: 'Q001',
          salesmanId: 'SALES001',
          totalAmount: 601.25
        }
      };

      service.convertToEOrder('Q001', eOrderData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.eOrderId).toBe('EO001');
        expect(response.data.quotationId).toBe('Q001');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/Q001/convert-to-eorder`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(eOrderData);
      req.flush(mockResponse);
    });
  });

  describe('getCustomers', () => {
    it('should fetch all customers', () => {
      const mockCustomers: Customer[] = [
        {
          id: 'CUST001',
          name: 'Medical Store A',
          email: 'contact@medicalstore.com',
          phone: '+92-300-1234567',
          address: '123 Main Street',
          city: 'Lahore',
          creditLimit: 50000,
          currentBalance: 12500,
          isActive: true,
          loyaltyTier: 'gold'
        },
        {
          id: 'CUST002',
          name: 'Pharma Plus',
          email: 'info@pharmacplus.com',
          phone: '+92-301-7654321',
          address: '456 Health Avenue',
          city: 'Karachi',
          creditLimit: 75000,
          currentBalance: 0,
          isActive: true,
          loyaltyTier: 'platinum'
        }
      ];

      const mockResponse = { success: true, data: mockCustomers };

      service.getCustomers().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(response.data[0].name).toBe('Medical Store A');
        expect(response.data[1].loyaltyTier).toBe('platinum');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/customers`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('calculateQuotationTotal', () => {
    it('should calculate quotation total correctly', () => {
      const items: QuotationItem[] = [
        { itemId: '1', itemName: 'Item 1', quantity: 10, unitPrice: 50.00, discountPercent: 5, discountAmount: 25.00, totalPrice: 475.00 },
        { itemId: '2', itemName: 'Item 2', quantity: 5, unitPrice: 80.00, discountPercent: 10, discountAmount: 40.00, totalPrice: 360.00 }
      ];

      // Test with no tax
      let total = service.calculateQuotationTotal(items, 0);
      expect(total).toBe(835.00); // 475 + 360

      // Test with 15% tax
      total = service.calculateQuotationTotal(items, 15);
      expect(total).toBe(960.25); // 835 + (835 * 0.15)
    });
  });

  describe('calculateItemTotal', () => {
    it('should calculate item total with discount correctly', () => {
      const result = service.calculateItemTotal(10, 50.00, 5);
      expect(result.discountAmount).toBe(25.00); // 10 * 50 * 0.05
      expect(result.totalPrice).toBe(475.00); // (10 * 50) - 25
    });

    it('should handle zero discount', () => {
      const result = service.calculateItemTotal(5, 100.00, 0);
      expect(result.discountAmount).toBe(0);
      expect(result.totalPrice).toBe(500.00);
    });

    it('should handle 100% discount', () => {
      const result = service.calculateItemTotal(2, 200.00, 100);
      expect(result.discountAmount).toBe(400.00);
      expect(result.totalPrice).toBe(0);
    });
  });

  describe('validateQuotation', () => {
    it('should validate a correct quotation', () => {
      const validQuotation = {
        customerId: 'CUST001',
        quotationDate: '2024-03-20',
        validUntil: '2024-03-30',
        items: [
          { itemId: 'ITEM001', quantity: 10, unitPrice: 50.00, discountPercent: 5 }
        ]
      };

      const result = service.validateQuotation(validQuotation);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify validation errors', () => {
      const invalidQuotation = {
        // Missing customerId
        quotationDate: '2024-03-20',
        validUntil: '2024-03-15', // Before quotation date
        items: [
          { itemId: '', quantity: -5, unitPrice: 0, discountPercent: 150 }, // Invalid item
          { quantity: 10, unitPrice: 50.00, discountPercent: 5 } // Missing itemId
        ]
        // Missing validUntil
      };

      const result = service.validateQuotation(invalidQuotation);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer is required');
      expect(result.errors).toContain('Validity date must be after quotation date');
      expect(result.errors).toContain('Item 1: Item is required');
      expect(result.errors).toContain('Item 1: Quantity must be greater than 0');
      expect(result.errors).toContain('Item 1: Unit price must be greater than 0');
      expect(result.errors).toContain('Item 1: Discount percentage must be between 0 and 100');
      expect(result.errors).toContain('Item 2: Item is required');
    });
  });

  describe('isQuotationExpired', () => {
    it('should return true for expired quotation', () => {
      const expiredQuotation: Quotation = {
        id: 'Q001',
        quotationNumber: 'QT-2024-001',
        customerId: 'CUST001',
        customerName: 'Test Customer',
        quotationDate: '2024-03-01',
        validUntil: '2024-03-10', // Past date
        status: 'sent',
        items: [],
        subtotal: 0,
        totalDiscount: 0,
        taxAmount: 0,
        totalAmount: 0,
        createdBy: 'salesman1'
      };

      expect(service.isQuotationExpired(expiredQuotation)).toBe(true);
    });

    it('should return false for valid quotation', () => {
      const validQuotation: Quotation = {
        id: 'Q001',
        quotationNumber: 'QT-2024-001',
        customerId: 'CUST001',
        customerName: 'Test Customer',
        quotationDate: '2024-03-20',
        validUntil: '2024-04-20', // Future date
        status: 'sent',
        items: [],
        subtotal: 0,
        totalDiscount: 0,
        taxAmount: 0,
        totalAmount: 0,
        createdBy: 'salesman1'
      };

      expect(service.isQuotationExpired(validQuotation)).toBe(false);
    });

    it('should return false for converted quotation even if expired', () => {
      const convertedQuotation: Quotation = {
        id: 'Q001',
        quotationNumber: 'QT-2024-001',
        customerId: 'CUST001',
        customerName: 'Test Customer',
        quotationDate: '2024-03-01',
        validUntil: '2024-03-10', // Past date
        status: 'converted', // Converted status
        items: [],
        subtotal: 0,
        totalDiscount: 0,
        taxAmount: 0,
        totalAmount: 0,
        createdBy: 'salesman1'
      };

      expect(service.isQuotationExpired(convertedQuotation)).toBe(false);
    });
  });

  describe('getQuotationStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(service.getQuotationStatusColor('draft')).toBe('#9E9E9E');
      expect(service.getQuotationStatusColor('sent')).toBe('#2196F3');
      expect(service.getQuotationStatusColor('approved')).toBe('#4CAF50');
      expect(service.getQuotationStatusColor('rejected')).toBe('#F44336');
      expect(service.getQuotationStatusColor('expired')).toBe('#FF9800');
      expect(service.getQuotationStatusColor('converted')).toBe('#9C27B0');
    });
  });

  describe('getQuotationStatusText', () => {
    it('should return correct text for each status', () => {
      expect(service.getQuotationStatusText('draft')).toBe('Draft');
      expect(service.getQuotationStatusText('sent')).toBe('Sent');
      expect(service.getQuotationStatusText('approved')).toBe('Approved');
      expect(service.getQuotationStatusText('rejected')).toBe('Rejected');
      expect(service.getQuotationStatusText('expired')).toBe('Expired');
      expect(service.getQuotationStatusText('converted')).toBe('Converted');
    });
  });

  describe('duplicateQuotation', () => {
    it('should duplicate a quotation', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'Q003',
          quotationNumber: 'QT-2024-003',
          status: 'draft',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          quotationDate: '2024-03-22',
          validUntil: '2024-04-06',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, discountPercent: 5, discountAmount: 27.50, totalPrice: 522.50 }
          ],
          subtotal: 550.00,
          totalDiscount: 27.50,
          taxAmount: 78.75,
          totalAmount: 601.25,
          createdBy: 'salesman1'
        }
      };

      service.duplicateQuotation('Q001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('Q003');
        expect(response.data.status).toBe('draft');
        expect(response.data.quotationNumber).toBe('QT-2024-003');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/Q001/duplicate`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('exportQuotations', () => {
    it('should export quotations in specified format', () => {
      const exportParams = {
        format: 'excel' as const,
        status: 'approved',
        startDate: '2024-01-01',
        endDate: '2024-03-31'
      };

      const mockBlob = new Blob(['mock,excel,data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      service.exportQuotations(exportParams).subscribe(response => {
        expect(response).toBe(mockBlob);
      });

      const req = httpMock.expectOne(req => req.url.includes('/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('format')).toBe('excel');
      expect(req.request.params.get('status')).toBe('approved');
      expect(req.request.params.get('startDate')).toBe('2024-01-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      req.flush(mockBlob);
    });
  });
});
