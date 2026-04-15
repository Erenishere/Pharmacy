import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { EOrderService, EOrder, EOrderItem, Salesman, Scheme } from './e-order.service';

describe('EOrderService', () => {
  let service: EOrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EOrderService]
    });

    service = TestBed.inject(EOrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getEOrders', () => {
    it('should fetch e-orders with query parameters', () => {
      const mockParams = { status: 'approved', salesmanId: 'SALES001', priority: 'urgent', page: 1, limit: 10 };
      const mockResponse = {
        success: true,
        data: [
          {
            id: 'EO001',
            orderNumber: 'EO-2024-001',
            customerId: 'CUST001',
            customerName: 'Medical Store A',
            salesmanId: 'SALES001',
            salesmanName: 'John Doe',
            orderDate: '2024-03-20',
            deliveryDate: '2024-03-22',
            priority: 'urgent',
            status: 'approved',
            items: [
              {
                itemId: 'ITEM001',
                itemName: 'Paracetamol 500mg',
                quantity: 50,
                unitPrice: 5.50,
                schemeId: 'SCH001',
                schemeName: 'Bulk Discount 10%',
                discountPercent: 10,
                discountAmount: 27.50,
                totalPrice: 247.50
              }
            ],
            subtotal: 275.00,
            totalDiscount: 27.50,
            taxAmount: 37.13,
            deliveryCharges: 50.00,
            totalAmount: 334.63,
            commissionAmount: 20.08,
            commissionRate: 6,
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

      service.getEOrders(mockParams).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBeInstanceOf(Array);
        expect(response.data[0].orderNumber).toBe('EO-2024-001');
        expect(response.data[0].status).toBe('approved');
        expect(response.data[0].priority).toBe('urgent');
        expect(response.pagination).toBeDefined();
      });

      const req = httpMock.expectOne(req => req.url.includes('/e-orders'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('status')).toBe('approved');
      expect(req.request.params.get('salesmanId')).toBe('SALES001');
      expect(req.request.params.get('priority')).toBe('urgent');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush(mockResponse);
    });
  });

  describe('getEOrderById', () => {
    it('should fetch a single e-order by ID', () => {
      const mockEOrder: EOrder = {
        id: 'EO001',
        orderNumber: 'EO-2024-001',
        customerId: 'CUST001',
        customerName: 'Medical Store A',
        customerPhone: '+92-300-1234567',
        salesmanId: 'SALES001',
        salesmanName: 'John Doe',
        orderDate: '2024-03-20',
        deliveryDate: '2024-03-22',
        priority: 'urgent',
        status: 'processing',
        items: [
          {
            itemId: 'ITEM001',
            itemName: 'Paracetamol 500mg',
            quantity: 50,
            unitPrice: 5.50,
            schemeId: 'SCH001',
            schemeName: 'Bulk Discount 10%',
            discountPercent: 10,
            discountAmount: 27.50,
            totalPrice: 247.50,
            batchNumber: 'BAT001',
            expiryDate: '2025-03-20',
            packSize: '100 tablets'
          }
        ],
        subtotal: 275.00,
        totalDiscount: 27.50,
        taxAmount: 37.13,
        deliveryCharges: 50.00,
        totalAmount: 334.63,
        notes: 'Urgent delivery required',
        deliveryAddress: '123 Main Street, Lahore',
        paymentTerms: 'Cash on Delivery',
        createdBy: 'salesman1',
        approvedBy: 'manager',
        approvedDate: '2024-03-20T10:00:00Z',
        processedBy: 'warehouse_manager',
        processedDate: '2024-03-20T14:00:00Z',
        commissionAmount: 20.08,
        commissionRate: 6
      };

      const mockResponse = { success: true, data: mockEOrder };

      service.getEOrderById('EO001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('EO001');
        expect(response.data.items).toHaveLength(1);
        expect(response.data.priority).toBe('urgent');
        expect(response.data.commissionAmount).toBe(20.08);
        expect(response.data.approvedBy).toBe('manager');
        expect(response.data.processedBy).toBe('warehouse_manager');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/EO001`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('createEOrder', () => {
    it('should create a new e-order', () => {
      const newOrder = {
        customerId: 'CUST001',
        salesmanId: 'SALES001',
        deliveryDate: '2024-03-22',
        priority: 'urgent' as const,
        items: [
          {
            itemId: 'ITEM001',
            quantity: 50,
            unitPrice: 5.50,
            discountPercent: 10
          }
        ],
        notes: 'Urgent delivery required'
      };

      const mockCreatedOrder: EOrder = {
        ...newOrder,
        id: 'EO002',
        orderNumber: 'EO-2024-002',
        customerName: 'Medical Store A',
        salesmanName: 'John Doe',
        orderDate: '2024-03-20',
        status: 'draft',
        subtotal: 275.00,
        totalDiscount: 27.50,
        taxAmount: 37.13,
        deliveryCharges: 50.00,
        totalAmount: 334.63,
        commissionAmount: 20.08,
        commissionRate: 6,
        createdBy: 'salesman1'
      };

      const mockResponse = { success: true, data: mockCreatedOrder };

      service.createEOrder(newOrder).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.id).toBe('EO002');
        expect(response.data.status).toBe('draft');
        expect(response.data.totalAmount).toBe(334.63);
        expect(response.data.commissionAmount).toBe(20.08);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(newOrder);
      req.flush(mockResponse);
    });
  });

  describe('submitEOrder', () => {
    it('should submit an e-order for approval', () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'EO001',
          status: 'pending',
          submittedAt: '2024-03-20T10:00:00Z'
        }
      };

      service.submitEOrder('EO001').subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('pending');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/EO001/submit`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('approveEOrder', () => {
    it('should approve an e-order', () => {
      const approvalData = {
        approvedBy: 'manager',
        notes: 'Approved for urgent processing'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'EO001',
          status: 'approved',
          approvedBy: 'manager',
          approvedDate: '2024-03-20T11:00:00Z'
        }
      };

      service.approveEOrder('EO001', approvalData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('approved');
        expect(response.data.approvedBy).toBe('manager');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/EO001/approve`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(approvalData);
      req.flush(mockResponse);
    });
  });

  describe('processEOrder', () => {
    it('should process an approved e-order with batch allocation', () => {
      const processData = {
        processedBy: 'warehouse_manager',
        items: [
          {
            itemId: 'ITEM001',
            batchNumber: 'BAT001',
            expiryDate: '2025-03-20',
            quantity: 50
          }
        ],
        notes: 'Allocated from main warehouse stock'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'EO001',
          status: 'processing',
          processedBy: 'warehouse_manager',
          processedDate: '2024-03-20T14:00:00Z'
        }
      };

      service.processEOrder('EO001', processData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('processing');
        expect(response.data.processedBy).toBe('warehouse_manager');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/EO001/process`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(processData);
      req.flush(mockResponse);
    });
  });

  describe('markReadyForDelivery', () => {
    it('should mark processed order as ready for delivery', () => {
      const readyData = { notes: 'Order packed and ready for delivery' };

      const mockResponse = {
        success: true,
        data: {
          id: 'EO001',
          status: 'ready',
          readyDate: '2024-03-20T16:00:00Z'
        }
      };

      service.markReadyForDelivery('EO001', readyData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('ready');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/EO001/ready`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(readyData);
      req.flush(mockResponse);
    });
  });

  describe('assignDelivery', () => {
    it('should assign delivery personnel and date', () => {
      const deliveryData = {
        deliveredBy: 'delivery_person_1',
        deliveryDate: '2024-03-21',
        notes: 'Will deliver in morning slot'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'EO001',
          status: 'out_for_delivery',
          deliveredBy: 'delivery_person_1',
          deliveryDate: '2024-03-21'
        }
      };

      service.assignDelivery('EO001', deliveryData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('out_for_delivery');
        expect(response.data.deliveredBy).toBe('delivery_person_1');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/EO001/assign-delivery`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(deliveryData);
      req.flush(mockResponse);
    });
  });

  describe('markDelivered', () => {
    it('should mark order as delivered with customer signature', () => {
      const deliveryData = {
        deliveredBy: 'delivery_person_1',
        deliveryDate: '2024-03-21',
        customerSignature: 'signature_data',
        notes: 'Delivered successfully, customer satisfied'
      };

      const mockResponse = {
        success: true,
        data: {
          id: 'EO001',
          status: 'delivered',
          deliveredBy: 'delivery_person_1',
          deliveredDate: '2024-03-21T10:30:00Z'
        }
      };

      service.markDelivered('EO001', deliveryData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.status).toBe('delivered');
        expect(response.data.deliveredBy).toBe('delivery_person_1');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/EO001/deliver`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(deliveryData);
      req.flush(mockResponse);
    });
  });

  describe('convertToInvoice', () => {
    it('should convert delivered e-order to invoice', () => {
      const invoiceData = {
        invoiceNumber: 'INV-2024-001',
        invoiceDate: '2024-03-21',
        dueDate: '2024-04-20',
        paymentTerms: 'Net 30',
        notes: 'Invoice generated from e-order delivery'
      };

      const mockResponse = {
        success: true,
        data: {
          invoiceId: 'INV001',
          eOrderId: 'EO001',
          totalAmount: 334.63,
          dueDate: '2024-04-20',
          convertedToInvoice: true,
          invoiceId: 'INV001'
        }
      };

      service.convertToInvoice('EO001', invoiceData).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data.invoiceId).toBe('INV001');
        expect(response.data.eOrderId).toBe('EO001');
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/EO001/convert-to-invoice`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(invoiceData);
      req.flush(mockResponse);
    });
  });

  describe('getSalesmen', () => {
    it('should fetch all salesmen', () => {
      const mockSalesmen: Salesman[] = [
        {
          id: 'SALES001',
          name: 'John Doe',
          email: 'john@company.com',
          phone: '+92-300-1234567',
          territory: 'Lahore',
          isActive: true,
          commissionRate: 6,
          targetAmount: 50000,
          currentMonthSales: 35000
        },
        {
          id: 'SALES002',
          name: 'Jane Smith',
          email: 'jane@company.com',
          phone: '+92-301-7654321',
          territory: 'Karachi',
          isActive: true,
          commissionRate: 5,
          targetAmount: 45000,
          currentMonthSales: 28000
        }
      ];

      const mockResponse = { success: true, data: mockSalesmen };

      service.getSalesmen().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(response.data[0].name).toBe('John Doe');
        expect(response.data[0].commissionRate).toBe(6);
        expect(response.data[1].currentMonthSales).toBe(28000);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/salesmen`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getSchemes', () => {
    it('should fetch all schemes', () => {
      const mockSchemes: Scheme[] = [
        {
          id: 'SCH001',
          name: 'Bulk Discount 10%',
          description: '10% discount on orders above 100 units',
          discountPercent: 10,
          minimumQuantity: 100,
          applicableItems: ['ITEM001', 'ITEM002'],
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          isActive: true
        },
        {
          id: 'SCH002',
          name: 'Seasonal Offer 15%',
          description: '15% discount for seasonal promotion',
          discountPercent: 15,
          minimumQuantity: 50,
          applicableItems: ['ITEM003'],
          startDate: '2024-03-01',
          endDate: '2024-03-31',
          isActive: true
        }
      ];

      const mockResponse = { success: true, data: mockSchemes };

      service.getSchemes().subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(response.data[0].name).toBe('Bulk Discount 10%');
        expect(response.data[0].discountPercent).toBe(10);
        expect(response.data[1].minimumQuantity).toBe(50);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/schemes`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getApplicableSchemes', () => {
    it('should fetch applicable schemes for item and quantity', () => {
      const mockApplicableSchemes: Scheme[] = [
        {
          id: 'SCH001',
          name: 'Bulk Discount 10%',
          description: '10% discount on orders above 100 units',
          discountPercent: 10,
          minimumQuantity: 100,
          applicableItems: ['ITEM001'],
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          isActive: true
        }
      ];

      const mockResponse = { success: true, data: mockApplicableSchemes };

      service.getApplicableSchemes('ITEM001', 120).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(1);
        expect(response.data[0].id).toBe('SCH001');
        expect(response.data[0].discountPercent).toBe(10);
      });

      const req = httpMock.expectOne(req => req.url.includes('/schemes/applicable'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('itemId')).toBe('ITEM001');
      expect(req.request.params.get('quantity')).toBe('120');
      req.flush(mockResponse);
    });
  });

  describe('calculateEOrderTotal', () => {
    it('should calculate e-order total correctly', () => {
      const items: EOrderItem[] = [
        { itemId: '1', itemName: 'Item 1', quantity: 10, unitPrice: 50.00, discountPercent: 5, discountAmount: 25.00, totalPrice: 475.00 },
        { itemId: '2', itemName: 'Item 2', quantity: 5, unitPrice: 80.00, discountPercent: 10, discountAmount: 40.00, totalPrice: 360.00 }
      ];

      // Test with tax and delivery charges
      let total = service.calculateEOrderTotal(items, 15, 50);
      expect(total).toBe(995.25); // (475 + 360) + 15% tax + 50 delivery = 835 + 125.25 + 50

      // Test with no tax or delivery
      total = service.calculateEOrderTotal(items, 0, 0);
      expect(total).toBe(835.00);
    });
  });

  describe('calculateCommission', () => {
    it('should calculate commission correctly', () => {
      expect(service.calculateCommission(1000, 5)).toBe(50.00);
      expect(service.calculateCommission(5000, 8)).toBe(400.00);
      expect(service.calculateCommission(0, 10)).toBe(0);
    });
  });

  describe('validateEOrder', () => {
    it('should validate a correct e-order', () => {
      const validOrder = {
        customerId: 'CUST001',
        salesmanId: 'SALES001',
        orderDate: '2024-03-20',
        deliveryDate: '2024-03-22',
        items: [
          { itemId: 'ITEM001', quantity: 10, unitPrice: 50.00, discountPercent: 5 }
        ]
      };

      const result = service.validateEOrder(validOrder);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify validation errors', () => {
      const invalidOrder = {
        // Missing customerId and salesmanId
        orderDate: '2024-03-20',
        deliveryDate: '2024-03-15', // Before order date
        items: [
          { itemId: '', quantity: -5, unitPrice: 0, discountPercent: 150 }, // Invalid item
          { quantity: 10, unitPrice: 50.00, discountPercent: 5 } // Missing itemId
        ]
        // Missing deliveryDate
      };

      const result = service.validateEOrder(invalidOrder);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer is required');
      expect(result.errors).toContain('Salesman is required');
      expect(result.errors).toContain('Delivery date is required');
      expect(result.errors).toContain('Delivery date cannot be before order date');
      expect(result.errors).toContain('Item 1: Item is required');
      expect(result.errors).toContain('Item 1: Quantity must be greater than 0');
      expect(result.errors).toContain('Item 1: Unit price must be greater than 0');
      expect(result.errors).toContain('Item 1: Discount percentage must be between 0 and 100');
      expect(result.errors).toContain('Item 2: Item is required');
    });
  });

  describe('getOrderStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(service.getOrderStatusColor('draft')).toBe('#9E9E9E');
      expect(service.getOrderStatusColor('pending')).toBe('#FF9800');
      expect(service.getOrderStatusColor('approved')).toBe('#2196F3');
      expect(service.getOrderStatusColor('processing')).toBe('#9C27B0');
      expect(service.getOrderStatusColor('ready')).toBe('#FF5722');
      expect(service.getOrderStatusColor('out_for_delivery')).toBe('#795548');
      expect(service.getOrderStatusColor('delivered')).toBe('#4CAF50');
      expect(service.getOrderStatusColor('cancelled')).toBe('#F44336');
    });
  });

  describe('getOrderStatusText', () => {
    it('should return correct text for each status', () => {
      expect(service.getOrderStatusText('draft')).toBe('Draft');
      expect(service.getOrderStatusText('pending')).toBe('Pending Approval');
      expect(service.getOrderStatusText('approved')).toBe('Approved');
      expect(service.getOrderStatusText('processing')).toBe('Processing');
      expect(service.getOrderStatusText('ready')).toBe('Ready for Delivery');
      expect(service.getOrderStatusText('out_for_delivery')).toBe('Out for Delivery');
      expect(service.getOrderStatusText('delivered')).toBe('Delivered');
      expect(service.getOrderStatusText('cancelled')).toBe('Cancelled');
    });
  });

  describe('getPriorityColor', () => {
    it('should return correct colors for each priority', () => {
      expect(service.getPriorityColor('normal')).toBe('#4CAF50');
      expect(service.getPriorityColor('urgent')).toBe('#FF9800');
      expect(service.getPriorityColor('express')).toBe('#F44336');
    });
  });

  describe('getPriorityText', () => {
    it('should return correct text for each priority', () => {
      expect(service.getPriorityText('normal')).toBe('Normal');
      expect(service.getPriorityText('urgent')).toBe('Urgent');
      expect(service.getPriorityText('express')).toBe('Express');
    });
  });

  describe('getAvailableBatches', () => {
    it('should fetch available batches for item and quantity', () => {
      const mockBatches = [
        {
          batchNumber: 'BAT001',
          expiryDate: '2025-03-20',
          availableQuantity: 150,
          unitPrice: 5.50,
          location: 'Main Warehouse'
        },
        {
          batchNumber: 'BAT002',
          expiryDate: '2025-06-15',
          availableQuantity: 200,
          unitPrice: 5.75,
          location: 'Secondary Warehouse'
        }
      ];

      const mockResponse = { success: true, data: mockBatches };

      service.getAvailableBatches('ITEM001', 100).subscribe(response => {
        expect(response.success).toBe(true);
        expect(response.data).toHaveLength(2);
        expect(response.data[0].batchNumber).toBe('BAT001');
        expect(response.data[0].availableQuantity).toBe(150);
      });

      const req = httpMock.expectOne(req => req.url.includes('/batches/available'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('itemId')).toBe('ITEM001');
      expect(req.request.params.get('quantity')).toBe('100');
      req.flush(mockResponse);
    });
  });

  describe('reserveStock', () => {
    it('should reserve stock for order items', () => {
      const reservationData = {
        items: [
          { itemId: 'ITEM001', quantity: 50, batchNumber: 'BAT001' },
          { itemId: 'ITEM002', quantity: 25, batchNumber: 'BAT002' }
        ]
      };

      const mockResponse = { success: true, data: null };

      service.reserveStock('EO001', reservationData.items).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/EO001/reserve-stock`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ items: reservationData.items });
      req.flush(mockResponse);
    });
  });

  describe('exportEOrders', () => {
    it('should export e-orders in specified format', () => {
      const exportParams = {
        format: 'excel' as const,
        status: 'delivered',
        salesmanId: 'SALES001',
        startDate: '2024-03-01',
        endDate: '2024-03-31'
      };

      const mockBlob = new Blob(['mock,excel,data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      service.exportEOrders(exportParams).subscribe(response => {
        expect(response).toBe(mockBlob);
      });

      const req = httpMock.expectOne(req => req.url.includes('/export'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('format')).toBe('excel');
      expect(req.request.params.get('status')).toBe('delivered');
      expect(req.request.params.get('salesmanId')).toBe('SALES001');
      expect(req.request.params.get('startDate')).toBe('2024-03-01');
      expect(req.request.params.get('endDate')).toBe('2024-03-31');
      req.flush(mockResponse);
    });
  });
});
