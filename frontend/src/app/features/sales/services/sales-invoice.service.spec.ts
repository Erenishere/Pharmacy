import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { SalesInvoiceService, SalesInvoice, InvoiceItem, PaymentTransaction } from './sales-invoice.service';

describe('SalesInvoiceService', () => {
  let service: SalesInvoiceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SalesInvoiceService]
    });

    service = TestBed.inject(SalesInvoiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getInvoices', () => {
    it('should fetch invoices with query parameters', () => {
      const mockParams = { status: 'sent', customerId: 'CUST001', paymentStatus: 'partial', page: 1, limit: 10 };
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'INV001',
            invoiceNumber: 'INV-2024-001',
            customerId: 'CUST001',
            customerName: 'Medical Store A',
            invoiceDate: '2024-03-20',
            dueDate: '2024-04-19',
            paymentTerms: 'Net 30',
            status: 'sent',
            items: [
              {
                itemId: 'ITEM001',
                itemName: 'Paracetamol 500mg',
                quantity: 100,
                unitPrice: 5.50,
                discountPercent: 5,
                discountAmount: 27.50,
                taxPercent: 15,
                taxAmount: 70.88,
                totalPrice: 548.88
              }
            ],
            subtotal: 550.00,
            totalDiscount: 27.50,
            totalTax: 70.88,
            deliveryCharges: 0,
            totalAmount: 593.38,
            paidAmount: 300.00,
            balanceAmount: 293.38,
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

      service.getInvoices(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBeInstanceOf(Array);
        expect(response.data[0].invoiceNumber).toBe('INV-2024-001');
        expect(response.data[0].status).toBe('sent');
        expect(response.data[0].balanceAmount).toBe(293.38);
        expect(response.pagination).toBeDefined();
      });

      const req = httpMock.expectOne(req => req.url.includes('/invoices'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('status')).toBe('sent');
      expect(req.request.params.get('customerId')).toBe('CUST001');
      expect(req.request.params.get('paymentStatus')).toBe('partial');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockResponse);
    });
  });

  describe('getInvoiceById', () => {
    it('should fetch a single invoice by ID', () => {
      const mockInvoice: SalesInvoice = {
        id: 'INV001',
        invoiceNumber: 'INV-2024-001',
        customerId: 'CUST001',
        customerName: 'Medical Store A',
        customerEmail: 'contact@medicalstore.com',
        customerPhone: '+92-300-1234567',
        customerAddress: '123 Main Street, Lahore',
        invoiceDate: '2024-03-20',
        dueDate: '2024-04-19',
        paymentTerms: 'Net 30',
        status: 'paid',
        items: [
          {
            itemId: 'ITEM001',
            itemName: 'Paracetamol 500mg',
            quantity: 100,
            unitPrice: 5.50,
            discountPercent: 5,
            discountAmount: 27.50,
            taxPercent: 15,
            taxAmount: 70.88,
            totalPrice: 548.88,
            batchNumber: 'BAT001',
            expiryDate: '2025-03-20',
            packSize: '100 tablets'
          }
        ],
        subtotal: 550.00,
        totalDiscount: 27.50,
        totalTax: 70.88,
        deliveryCharges: 50.00,
        totalAmount: 593.38,
        paidAmount: 593.38,
        balanceAmount: 0,
        notes: 'Payment received via bank transfer',
        referenceNumber: 'REF-2024-001',
        createdBy: 'salesman1',
        sentBy: 'salesman1',
        sentDate: '2024-03-20T10:00:00Z',
        paidBy: 'accountant',
        paidDate: '2024-03-25T14:00:00Z',
        paymentMethod: 'bank_transfer',
        receiptNumber: 'RCP-2024-001'
      };

      const mockResponse = { success: true, data: mockInvoice };

      service.getInvoiceById('INV001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('INV001');
        expect(response.data.items).toHaveLength(1);
        expect(response.data.status).toBe('paid');
        expect(response.data.balanceAmount).toBe(0);
        expect(response.data.customerEmail).toBe('contact@medicalstore.com');
        expect(response.data.paymentMethod).toBe('bank_transfer');
        expect(response.data.receiptNumber).toBe('RCP-2024-001');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/invoices/INV001`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('createInvoice', () => {
    it('should create a new sales invoice', () => {
      const newInvoice = {
        customerId: 'CUST001',
        dueDate: '2024-04-19',
        paymentTerms: 'Net 30',
        items: [
          {
            itemId: 'ITEM001',
            quantity: 100,
            unitPrice: 5.50,
            discountPercent: 5,
            taxPercent: 15
          }
        ],
        deliveryCharges: 50.00,
        notes: 'Urgent delivery required'
      };

      const mockCreatedInvoice: SalesInvoice = {
        ...newInvoice,
        id: 'INV002',
        invoiceNumber: 'INV-2024-002',
        customerName: 'Medical Store A',
        invoiceDate: '2024-03-20',
        status: 'draft',
        subtotal: 550.00,
        totalDiscount: 27.50,
        totalTax: 70.88,
        totalAmount: 593.38,
        paidAmount: 0,
        balanceAmount: 593.38,
        createdBy: 'salesman1'
      };

      const mockResponse = { success: true, data: mockCreatedInvoice };

      service.createInvoice(newInvoice).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('INV002');
        expect(response.data.status).toBe('draft');
        expect(response.data.totalAmount).toBe(593.38);
        expect(response.data.balanceAmount).toBe(593.38);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/invoices`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newInvoice);
      req.flush(mockResponse);
    });
  });

  describe('sendInvoice', () => {
    it('should send invoice to customer', () => {
      const sendData = {
        sentBy: 'salesman1',
        emailSubject: 'Invoice INV-2024-001 from Medical Store A',
        emailMessage: 'Please find attached invoice for your recent purchase.'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'INV001',
          status: 'sent',
          sentBy: 'salesman1',
          sentDate: '2024-03-20T14:00:00Z'
        }
      };

      service.sendInvoice('INV001', sendData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('sent');
        expect(response.data.sentBy).toBe('salesman1');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/invoices/INV001/send`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(sendData);
      req.flush(mockResponse);
    });
  });

  describe('processPayment', () => {
    it('should process payment for invoice', () => {
      const paymentData = {
        amount: 300.00,
        paymentMethod: 'bank_transfer' as const,
        paymentDate: '2024-03-25',
        referenceNumber: 'BT-2024-001',
        notes: 'Partial payment received',
        processedBy: 'accountant'
      };

      const mockResponse = {
        success: true,
        data: {
          invoice: {
            id: 'INV001',
            paidAmount: 300.00,
            balanceAmount: 293.38,
            status: 'sent'
          },
          transaction: {
            id: 'PAY001',
            invoiceId: 'INV001',
            amount: 300.00,
            paymentMethod: 'bank_transfer',
            paymentDate: '2024-03-25',
            referenceNumber: 'BT-2024-001',
            processedBy: 'accountant'
          }
        }
      };

      service.processPayment('INV001', paymentData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.invoice.paidAmount).toBe(300.00);
        expect(response.data.invoice.balanceAmount).toBe(293.38);
        expect(response.data.transaction.amount).toBe(300.00);
        expect(response.data.transaction.paymentMethod).toBe('bank_transfer');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/invoices/INV001/pay`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(paymentData);
      req.flush(mockResponse);
    });

    it('should process full payment and update invoice status', () => {
      const paymentData = {
        amount: 593.38,
        paymentMethod: 'cash' as const,
        paymentDate: '2024-03-26',
        processedBy: 'cashier'
      };

      const mockResponse = {
        success: true,
        data: {
          invoice: {
            id: 'INV001',
            paidAmount: 593.38,
            balanceAmount: 0,
            status: 'paid',
            paidBy: 'cashier',
            paidDate: '2024-03-26T10:00:00Z',
            paymentMethod: 'cash'
          },
          transaction: {
            id: 'PAY002',
            invoiceId: 'INV001',
            amount: 593.38,
            paymentMethod: 'cash',
            paymentDate: '2024-03-26',
            processedBy: 'cashier'
          }
        }
      };

      service.processPayment('INV001', paymentData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.invoice.status).toBe('paid');
        expect(response.data.invoice.balanceAmount).toBe(0);
        expect(response.data.invoice.paidBy).toBe('cashier');
        expect(response.data.invoice.paymentMethod).toBe('cash');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/invoices/INV001/pay`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(paymentData);
      req.flush(mockResponse);
    });
  });

  describe('getInvoicePayments', () => {
    it('should fetch payment transactions for invoice', () => {
      const mockPayments: PaymentTransaction[] = [
        {
          id: 'PAY001',
          invoiceId: 'INV001',
          amount: 300.00,
          paymentMethod: 'bank_transfer',
          paymentDate: '2024-03-25',
          referenceNumber: 'BT-2024-001',
          notes: 'Partial payment',
          processedBy: 'accountant'
        },
        {
          id: 'PAY002',
          invoiceId: 'INV001',
          amount: 293.38,
          paymentMethod: 'cash',
          paymentDate: '2024-03-26',
          processedBy: 'cashier'
        }
      ];

      const mockResponse = { success: true, data: mockPayments };

      service.getInvoicePayments('INV001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(response.data[0].amount).toBe(300.00);
        expect(response.data[1].paymentMethod).toBe('cash');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/invoices/INV001/payments`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('convertQuotationToInvoice', () => {
    it('should convert quotation to invoice', () => {
      const invoiceData = {
        dueDate: '2024-04-19',
        paymentTerms: 'Net 30',
        deliveryCharges: 50.00
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'INV003',
          invoiceNumber: 'INV-2024-003',
          convertedFrom: 'quotation',
          sourceId: 'Q001',
          totalAmount: 601.25,
          status: 'draft'
        }
      };

      service.convertQuotationToInvoice('Q001', invoiceData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.convertedFrom).toBe('quotation');
        expect(response.data.sourceId).toBe('Q001');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/quotations/Q001/convert-to-invoice`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(invoiceData);
      req.flush(mockResponse);
    });
  });

  describe('convertEOrderToInvoice', () => {
    it('should convert e-order to invoice', () => {
      const invoiceData = {
        dueDate: '2024-04-19',
        paymentTerms: 'Net 30'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'INV004',
          invoiceNumber: 'INV-2024-004',
          convertedFrom: 'e-order',
          sourceId: 'EO001',
          totalAmount: 1219.10,
          status: 'draft'
        }
      };

      service.convertEOrderToInvoice('EO001', invoiceData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.convertedFrom).toBe('e-order');
        expect(response.data.sourceId).toBe('EO001');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/e-orders/EO001/convert-to-invoice`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(invoiceData);
      req.flush(mockResponse);
    });
  });

  describe('generateReceipt', () => {
    it('should generate receipt for paid invoice', () => {
      const receiptData = {
        receiptNumber: 'RCP-2024-001',
        receiptDate: '2024-03-26',
        receivedBy: 'cashier',
        notes: 'Payment received in full'
      };

      const mockResponse = {
        success: true,
        data: {
          receiptId: 'RCP001',
          receiptNumber: 'RCP-2024-001',
          invoiceId: 'INV001',
          totalAmount: 593.38,
          receiptDate: '2024-03-26'
        }
      };

      service.generateReceipt('INV001', receiptData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.receiptNumber).toBe('RCP-2024-001');
        expect(response.data.invoiceId).toBe('INV001');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/invoices/INV001/generate-receipt`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(receiptData);
      req.flush(mockResponse);
    });
  });

  describe('calculateInvoiceTotal', () => {
    it('should calculate invoice total correctly', () => {
      const items: InvoiceItem[] = [
        { itemId: '1', itemName: 'Item 1', quantity: 10, unitPrice: 50.00, discountPercent: 5, discountAmount: 25.00, taxPercent: 15, taxAmount: 71.25, totalPrice: 521.25 },
        { itemId: '2', itemName: 'Item 2', quantity: 5, unitPrice: 80.00, discountPercent: 10, discountAmount: 40.00, taxPercent: 15, taxAmount: 48.00, totalPrice: 368.00 }
      ];

      // Test with delivery charges
      let total = service.calculateInvoiceTotal(items, 50.00);
      expect(total).toBe(939.25); // (521.25 + 368.00) + 50.00

      // Test without delivery charges
      total = service.calculateInvoiceTotal(items, 0);
      expect(total).toBe(889.25);
    });
  });

  describe('calculateItemTotal', () => {
    it('should calculate item total with discount and tax correctly', () => {
      const result = service.calculateItemTotal(10, 50.00, 5, 15);

      expect(result.quantity).toBe(10);
      expect(result.unitPrice).toBe(50.00);
      expect(result.discountPercent).toBe(5);
      expect(result.discountAmount).toBe(25.00); // 10 * 50 * 0.05
      expect(result.taxPercent).toBe(15);
      expect(result.taxAmount).toBe(71.25); // (500 - 25) * 0.15
      expect(result.totalPrice).toBe(496.25); // 500 - 25 + 71.25
    });
  });

  describe('validateInvoice', () => {
    it('should validate a correct invoice', () => {
      const validInvoice = {
        customerId: 'CUST001',
        invoiceDate: '2024-03-20',
        dueDate: '2024-04-19',
        items: [
          { itemId: 'ITEM001', quantity: 10, unitPrice: 50.00, discountPercent: 5, taxPercent: 15 }
        ]
      };

      const result = service.validateInvoice(validInvoice);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify validation errors', () => {
      const invalidInvoice = {
        // Missing customerId
        invoiceDate: '2024-03-20',
        dueDate: '2024-03-15', // Before invoice date
        items: [
          { itemId: '', quantity: -5, unitPrice: 0, discountPercent: 150, taxPercent: 200 }, // Invalid item
          { quantity: 10, unitPrice: 50.00, discountPercent: 5, taxPercent: 15 } // Missing itemId
        ]
        // Missing dueDate
      };

      const result = service.validateInvoice(invalidInvoice);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer is required');
      expect(result.errors).toContain('Due date is required');
      expect(result.errors).toContain('Due date must be after invoice date');
      expect(result.errors).toContain('Item 1: Item is required');
      expect(result.errors).toContain('Item 1: Quantity must be greater than 0');
      expect(result.errors).toContain('Item 1: Unit price must be greater than 0');
      expect(result.errors).toContain('Item 1: Discount percentage must be between 0 and 100');
      expect(result.errors).toContain('Item 1: Tax percentage must be between 0 and 100');
      expect(result.errors).toContain('Item 2: Item is required');
    });
  });

  describe('isInvoiceOverdue', () => {
    it('should return true for overdue invoice', () => {
      const overdueInvoice: SalesInvoice = {
        id: 'INV001',
        invoiceNumber: 'INV-2024-001',
        customerId: 'CUST001',
        customerName: 'Test Customer',
        invoiceDate: '2024-03-01',
        dueDate: '2024-03-15', // Past date
        paymentTerms: 'Net 15',
        status: 'sent',
        items: [],
        subtotal: 0,
        totalDiscount: 0,
        totalTax: 0,
        deliveryCharges: 0,
        totalAmount: 1000,
        paidAmount: 0,
        balanceAmount: 1000,
        createdBy: 'salesman1'
      };

      expect(service.isInvoiceOverdue(overdueInvoice)).toBe(true);
    });

    it('should return false for paid invoice', () => {
      const paidInvoice: SalesInvoice = {
        id: 'INV001',
        invoiceNumber: 'INV-2024-001',
        customerId: 'CUST001',
        customerName: 'Test Customer',
        invoiceDate: '2024-03-01',
        dueDate: '2024-03-15',
        paymentTerms: 'Net 15',
        status: 'paid',
        items: [],
        subtotal: 0,
        totalDiscount: 0,
        totalTax: 0,
        deliveryCharges: 0,
        totalAmount: 1000,
        paidAmount: 1000,
        balanceAmount: 0,
        createdBy: 'salesman1'
      };

      expect(service.isInvoiceOverdue(paidInvoice)).toBe(false);
    });

    it('should return false for future due date', () => {
      const futureInvoice: SalesInvoice = {
        id: 'INV001',
        invoiceNumber: 'INV-2024-001',
        customerId: 'CUST001',
        customerName: 'Test Customer',
        invoiceDate: '2024-03-20',
        dueDate: '2024-04-20', // Future date
        paymentTerms: 'Net 30',
        status: 'sent',
        items: [],
        subtotal: 0,
        totalDiscount: 0,
        totalTax: 0,
        deliveryCharges: 0,
        totalAmount: 1000,
        paidAmount: 0,
        balanceAmount: 1000,
        createdBy: 'salesman1'
      };

      expect(service.isInvoiceOverdue(futureInvoice)).toBe(false);
    });
  });

  describe('getInvoiceStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(service.getInvoiceStatusColor('draft')).toBe('#9E9E9E');
      expect(service.getInvoiceStatusColor('sent')).toBe('#2196F3');
      expect(service.getInvoiceStatusColor('paid')).toBe('#4CAF50');
      expect(service.getInvoiceStatusColor('overdue')).toBe('#F44336');
      expect(service.getInvoiceStatusColor('cancelled')).toBe('#666');
    });
  });

  describe('getInvoiceStatusText', () => {
    it('should return correct text for each status', () => {
      expect(service.getInvoiceStatusText('draft')).toBe('Draft');
      expect(service.getInvoiceStatusText('sent')).toBe('Sent');
      expect(service.getInvoiceStatusText('paid')).toBe('Paid');
      expect(service.getInvoiceStatusText('overdue')).toBe('Overdue');
      expect(service.getInvoiceStatusText('cancelled')).toBe('Cancelled');
    });
  });

  describe('getPaymentStatus', () => {
    it('should return correct payment status', () => {
      const unpaidInvoice: SalesInvoice = {
        id: 'INV001',
        invoiceNumber: 'INV-2024-001',
        customerId: 'CUST001',
        customerName: 'Test',
        invoiceDate: '2024-03-20',
        dueDate: '2024-04-19',
        paymentTerms: 'Net 30',
        status: 'sent',
        items: [],
        subtotal: 0,
        totalDiscount: 0,
        totalTax: 0,
        deliveryCharges: 0,
        totalAmount: 1000,
        paidAmount: 0,
        balanceAmount: 1000,
        createdBy: 'salesman1'
      };

      const partialInvoice: SalesInvoice = {
        ...unpaidInvoice,
        paidAmount: 500,
        balanceAmount: 500
      };

      const paidInvoice: SalesInvoice = {
        ...unpaidInvoice,
        paidAmount: 1000,
        balanceAmount: 0,
        status: 'paid'
      };

      expect(service.getPaymentStatus(unpaidInvoice)).toBe('unpaid');
      expect(service.getPaymentStatus(partialInvoice)).toBe('partial');
      expect(service.getPaymentStatus(paidInvoice)).toBe('paid');
    });
  });

  describe('calculateBalance', () => {
    it('should calculate balance correctly', () => {
      const invoice: SalesInvoice = {
        id: 'INV001',
        invoiceNumber: 'INV-2024-001',
        customerId: 'CUST001',
        customerName: 'Test',
        invoiceDate: '2024-03-20',
        dueDate: '2024-04-19',
        paymentTerms: 'Net 30',
        status: 'sent',
        items: [],
        subtotal: 0,
        totalDiscount: 0,
        totalTax: 0,
        deliveryCharges: 0,
        totalAmount: 1000,
        paidAmount: 300,
        balanceAmount: 700,
        createdBy: 'salesman1'
      };

      expect(service.calculateBalance(invoice)).toBe(700);
    });
  });

  describe('exportInvoices', () => {
    it('should export invoices in specified format', () => {
      const exportParams = {
        format: 'pdf' as const,
        status: 'paid',
        customerId: 'CUST001',
        startDate: '2024-03-01',
        endDate: '2024-03-31'
      };

      const mockBlob = new Blob(['mock,pdf,data'], { type: 'application/pdf' });

      service.exportInvoices(exportParams).subscribe(response => {
        expect(response).toBe(mockBlob);
      });

      const req = httpMock.expectOne(req => req.url.includes('/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('format')).toBe('pdf');
      expect(req.request.params.get('status')).toBe('paid');
      expect(req.request.params.get('customerId')).toBe('CUST001');
      expect(req.request.params.get('startDate')).toBe('2024-03-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      req.flush(mockBlob);
    });
  });
});
