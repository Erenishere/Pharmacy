import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PurchaseOrderService, PurchaseOrder, PurchaseOrderItem, Supplier } from './purchase-order.service';

describe('PurchaseOrderService', () => {
  let service: PurchaseOrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PurchaseOrderService]
    });

    service = TestBed.inject(PurchaseOrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getPurchaseOrders', () => {
    it('should fetch purchase orders with query parameters', () => {
      const mockParams = { status: 'approved', supplierId: 'SUP001', page: 1, limit: 10 };
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'PO001',
            poNumber: 'PO-2024-001',
            supplierId: 'SUP001',
            supplierName: 'Medical Suppliers Inc',
            orderDate: '2024-03-15',
            expectedDate: '2024-03-25',
            status: 'approved',
            items: [
              {
                itemId: 'ITEM001',
                itemName: 'Paracetamol 500mg',
                quantity: 100,
                unitPrice: 5.50,
                totalPrice: 550.00
              }
            ],
            subtotal: 550.00,
            taxAmount: 82.50,
            discountAmount: 0,
            totalAmount: 632.50,
            createdBy: 'admin'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      };

      service.getPurchaseOrders(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBeInstanceOf(Array);
        expect(response.data[0].poNumber).toBe('PO-2024-001');
        expect(response.data[0].status).toBe('approved');
        expect(response.pagination).toBeDefined();
      });

      const req = httpMock.expectOne(req => req.url.includes('/orders'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('status')).toBe('approved');
      expect(req.request.params.get('supplierId')).toBe('SUP001');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockResponse);
    });
  });

  describe('getPurchaseOrderById', () => {
    it('should fetch a single purchase order by ID', () => {
      const mockOrder: PurchaseOrder = {
        id: 'PO001',
        poNumber: 'PO-2024-001',
        supplierId: 'SUP001',
        supplierName: 'Medical Suppliers Inc',
        orderDate: '2024-03-15',
        expectedDate: '2024-03-25',
        status: 'approved',
        items: [
          {
            itemId: 'ITEM001',
            itemName: 'Paracetamol 500mg',
            quantity: 100,
            unitPrice: 5.50,
            totalPrice: 550.00,
            batchNumber: 'BAT001',
            expiryDate: '2025-03-15'
          }
        ],
        subtotal: 550.00,
        taxAmount: 82.50,
        discountAmount: 0,
        totalAmount: 632.50,
        createdBy: 'admin',
        approvedBy: 'manager',
        approvedDate: '2024-03-16',
        paymentTerms: 'Net 30',
        deliveryAddress: '123 Pharmacy Street, Lahore'
      };

      const mockResponse = { success: true, data: mockOrder };

      service.getPurchaseOrderById('PO001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('PO001');
        expect(response.data.items).toHaveLength(1);
        expect(response.data.approvedBy).toBe('manager');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/orders/PO001`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('createPurchaseOrder', () => {
    it('should create a new purchase order', () => {
      const newOrder = {
        supplierId: 'SUP001',
        expectedDate: '2024-03-25',
        items: [
          {
            itemId: 'ITEM001',
            quantity: 100,
            unitPrice: 5.50
          }
        ],
        notes: 'Urgent delivery required'
      };

      const mockCreatedOrder: PurchaseOrder = {
        ...newOrder,
        id: 'PO002',
        poNumber: 'PO-2024-002',
        supplierName: 'Medical Suppliers Inc',
        orderDate: '2024-03-20',
        status: 'draft',
        subtotal: 550.00,
        taxAmount: 82.50,
        discountAmount: 0,
        totalAmount: 632.50,
        createdBy: 'admin'
      };

      const mockResponse = { success: true, data: mockCreatedOrder };

      service.createPurchaseOrder(newOrder).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('PO002');
        expect(response.data.status).toBe('draft');
        expect(response.data.totalAmount).toBe(632.50);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/orders`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newOrder);
      req.flush(mockResponse);
    });
  });

  describe('updatePurchaseOrder', () => {
    it('should update an existing purchase order', () => {
      const updateData = {
        expectedDate: '2024-03-30',
        notes: 'Updated delivery date'
      };

      const mockUpdatedOrder: PurchaseOrder = {
        id: 'PO001',
        poNumber: 'PO-2024-001',
        supplierId: 'SUP001',
        supplierName: 'Medical Suppliers Inc',
        orderDate: '2024-03-15',
        expectedDate: '2024-03-30',
        status: 'draft',
        items: [],
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        createdBy: 'admin',
        notes: 'Updated delivery date'
      };

      const mockResponse = { success: true, data: mockUpdatedOrder };

      service.updatePurchaseOrder('PO001', updateData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.expectedDate).toBe('2024-03-30');
        expect(response.data.notes).toBe('Updated delivery date');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/orders/PO001`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updateData);
      req.flush(mockResponse);
    });
  });

  describe('submitPurchaseOrder', () => {
    it('should submit a purchase order for approval', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'PO001',
          status: 'pending',
          submittedAt: '2024-03-20T10:00:00Z'
        }
      };

      service.submitPurchaseOrder('PO001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('pending');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/orders/PO001/submit`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('approvePurchaseOrder', () => {
    it('should approve a purchase order', () => {
      const approvalData = {
        approvedBy: 'manager',
        notes: 'Approved for procurement'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'PO001',
          status: 'approved',
          approvedBy: 'manager',
          approvedDate: '2024-03-20T14:00:00Z'
        }
      };

      service.approvePurchaseOrder('PO001', approvalData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('approved');
        expect(response.data.approvedBy).toBe('manager');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/orders/PO001/approve`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(approvalData);
      req.flush(mockResponse);
    });
  });

  describe('receivePurchaseOrder', () => {
    it('should receive and process a purchase order', () => {
      const receiptData = {
        receivedBy: 'warehouse_manager',
        receivedItems: [
          {
            itemId: 'ITEM001',
            receivedQuantity: 95,
            batchNumber: 'BAT001',
            expiryDate: '2025-03-15',
            notes: '5 units damaged in transit'
          }
        ],
        invoiceNumber: 'INV-2024-001',
        notes: 'Partial receipt due to damage'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'PO001',
          status: 'partial',
          receivedBy: 'warehouse_manager',
          receivedDate: '2024-03-25T09:00:00Z',
          invoiceNumber: 'INV-2024-001'
        }
      };

      service.receivePurchaseOrder('PO001', receiptData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('partial');
        expect(response.data.receivedBy).toBe('warehouse_manager');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/orders/PO001/receive`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(receiptData);
      req.flush(mockResponse);
    });
  });

  describe('convertToInvoice', () => {
    it('should convert a received purchase order to invoice', () => {
      const invoiceData = {
        invoiceNumber: 'INV-2024-001',
        invoiceDate: '2024-03-25',
        dueDate: '2024-04-24',
        notes: 'Payment due within 30 days'
      };

      const mockResponse = {
        success: true,
        data: {
          invoiceId: 'INV001',
          poId: 'PO001',
          totalAmount: 632.50,
          dueDate: '2024-04-24'
        }
      };

      service.convertToInvoice('PO001', invoiceData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.invoiceId).toBe('INV001');
        expect(response.data.poId).toBe('PO001');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/orders/PO001/convert-to-invoice`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(invoiceData);
      req.flush(mockResponse);
    });
  });

  describe('getSuppliers', () => {
    it('should fetch all suppliers', () => {
      const mockSuppliers: Supplier[] = [
        {
          id: 'SUP001',
          name: 'Medical Suppliers Inc',
          contactPerson: 'John Smith',
          email: 'john@medsuppliers.com',
          phone: '+92-300-1234567',
          address: '123 Industrial Area, Lahore',
          paymentTerms: 'Net 30',
          creditLimit: 50000,
          isActive: true
        },
        {
          id: 'SUP002',
          name: 'Pharma Distributors Ltd',
          contactPerson: 'Jane Doe',
          email: 'jane@pharmadist.com',
          phone: '+92-301-7654321',
          address: '456 Commercial Street, Karachi',
          paymentTerms: 'Net 15',
          creditLimit: 75000,
          isActive: true
        }
      ];

      const mockResponse = { success: true, data: mockSuppliers };

      service.getSuppliers().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(response.data[0].name).toBe('Medical Suppliers Inc');
        expect(response.data[1].creditLimit).toBe(75000);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/suppliers`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('calculateOrderTotal', () => {
    it('should calculate order total correctly', () => {
      const items: PurchaseOrderItem[] = [
        { itemId: '1', itemName: 'Item 1', quantity: 10, unitPrice: 5.00, totalPrice: 50.00 },
        { itemId: '2', itemName: 'Item 2', quantity: 5, unitPrice: 8.00, totalPrice: 40.00 }
      ];

      // Test with no tax or discount
      let total = service.calculateOrderTotal(items, 0, 0);
      expect(total).toBe(90.00);

      // Test with 10% tax
      total = service.calculateOrderTotal(items, 10, 0);
      expect(total).toBe(99.00);

      // Test with 10% tax and $10 discount
      total = service.calculateOrderTotal(items, 10, 10);
      expect(total).toBe(89.00);
    });
  });

  describe('validatePurchaseOrder', () => {
    it('should validate a correct purchase order', () => {
      const validOrder = {
        supplierId: 'SUP001',
        expectedDate: '2024-03-25',
        items: [
          { itemId: 'ITEM001', quantity: 10, unitPrice: 5.50 }
        ]
      };

      const result = service.validatePurchaseOrder(validOrder);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify validation errors', () => {
      const invalidOrder = {
        // Missing supplierId
        expectedDate: '2024-03-25',
        items: [
          { itemId: '', quantity: -5, unitPrice: 0 }, // Invalid item
          { quantity: 10, unitPrice: 5.50 } // Missing itemId
        ]
        // Missing expectedDate
      };

      const result = service.validatePurchaseOrder(invalidOrder);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Supplier is required');
      expect(result.errors).toContain('Expected delivery date is required');
      expect(result.errors).toContain('Item 1: Item ID is required');
      expect(result.errors).toContain('Item 1: Quantity must be greater than 0');
      expect(result.errors).toContain('Item 1: Unit price must be greater than 0');
      expect(result.errors).toContain('Item 2: Item ID is required');
    });
  });

  describe('exportPurchaseOrders', () => {
    it('should export purchase orders in specified format', () => {
      const exportParams = {
        format: 'excel' as const,
        status: 'approved',
        startDate: '2024-01-01',
        endDate: '2024-03-31'
      };

      const mockBlob = new Blob(['mock,excel,data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      service.exportPurchaseOrders(exportParams).subscribe(response => {
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
