describe('E-Order Complete Workflow E2E Tests', () => {
  beforeEach(() => {
    // Login as salesman for full access
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: { id: 1, username: 'salesman1', role: 'salesman', permissions: ['read', 'write', 'sales'] }
        }
      }
    }).as('login');

    // Mock customers API
    cy.intercept('GET', '**/quotations/customers', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'CUST001',
            name: 'Medical Store A',
            email: 'contact@medicalstore.com',
            phone: '+92-300-1234567',
            address: '123 Main Street, Lahore',
            city: 'Lahore',
            creditLimit: 50000,
            currentBalance: 12500,
            isActive: true,
            loyaltyTier: 'gold'
          }
        ]
      }
    }).as('getCustomers');

    // Mock salesmen API
    cy.intercept('GET', '**/e-orders/salesmen', {
      statusCode: 200,
      body: {
        success: true,
        data: [
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
          }
        ]
      }
    }).as('getSalesmen');

    // Mock schemes API
    cy.intercept('GET', '**/e-orders/schemes', {
      statusCode: 200,
      body: {
        success: true,
        data: [
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
            name: 'Loyalty Discount 5%',
            description: '5% discount for gold tier customers',
            discountPercent: 5,
            minimumQuantity: 1,
            applicableItems: ['ITEM001', 'ITEM002', 'ITEM003'],
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true
          }
        ]
      }
    }).as('getSchemes');

    // Mock applicable schemes API
    cy.intercept('GET', '**/e-orders/schemes/applicable*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'SCH002',
            name: 'Loyalty Discount 5%',
            description: '5% discount for gold tier customers',
            discountPercent: 5,
            minimumQuantity: 1,
            applicableItems: ['ITEM001', 'ITEM002', 'ITEM003'],
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            isActive: true
          }
        ]
      }
    }).as('getApplicableSchemes');

    // Mock items API for item selection
    cy.intercept('GET', '**/items*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'ITEM001',
            name: 'Paracetamol 500mg',
            genericName: 'Paracetamol',
            category: 'Pain Relief',
            packSize: '100 tablets',
            unitPrice: 5.50,
            currentStock: 150
          },
          {
            id: 'ITEM002',
            name: 'Amoxicillin 250mg',
            genericName: 'Amoxicillin',
            category: 'Antibiotics',
            packSize: '100 capsules',
            unitPrice: 8.75,
            currentStock: 200
          }
        ]
      }
    }).as('getItems');

    // Login and navigate to e-orders
    cy.visit('/login');
    cy.get('input[formControlName="username"]').type('salesman1');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
  });

  it('should create e-order with scheme application and automatic calculations', () => {
    // Navigate to e-orders
    cy.visit('/e-orders');
    cy.wait(['@getSalesmen', '@getCustomers']);

    // Click create new e-order button
    cy.get('[data-cy="create-eorder-button"]').click();

    // Verify we're on the e-order creation page
    cy.url().should('include', '/e-orders/new');

    // Fill e-order header information
    cy.get('[data-cy="customer-select"]').click();
    cy.get('mat-option').contains('Medical Store A').click();

    cy.get('[data-cy="salesman-select"]').should('have.value', 'John Doe'); // Auto-selected based on login

    cy.get('input[formControlName="deliveryDate"]').type('2024-03-25');
    cy.get('[data-cy="priority-select"]').click();
    cy.get('mat-option').contains('Urgent').click();

    // Add first item - should auto-apply loyalty discount for gold tier customer
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('50');
    cy.get('input[formControlName="unitPrice"]').first().should('have.value', '5.50'); // Auto-filled

    // Verify scheme auto-application (5% discount for gold tier)
    cy.get('[data-cy="applied-scheme"]').first().should('contain', 'Loyalty Discount 5%');
    cy.get('input[formControlName="discountPercent"]').first().should('have.value', '5');
    cy.get('[data-cy="item-discount-amount"]').first().should('contain', '13.75'); // 50 * 5.50 * 0.05
    cy.get('[data-cy="item-total"]').first().should('contain', '261.25'); // (50 * 5.50) - 13.75

    // Add second item - should also get loyalty discount
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').eq(1).click();
    cy.get('mat-option').contains('Amoxicillin 250mg').click();
    cy.get('input[formControlName="quantity"]').eq(1).type('25');
    cy.get('input[formControlName="unitPrice"]').eq(1).should('have.value', '8.75');

    // Verify second item also gets loyalty discount
    cy.get('[data-cy="applied-scheme"]').eq(1).should('contain', 'Loyalty Discount 5%');
    cy.get('input[formControlName="discountPercent"]').eq(1).should('have.value', '5');
    cy.get('[data-cy="item-discount-amount"]').eq(1).should('contain', '10.94'); // 25 * 8.75 * 0.05
    cy.get('[data-cy="item-total"]').eq(1).should('contain', '207.81'); // (25 * 8.75) - 10.94

    // Add third item with higher quantity to trigger bulk discount
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').eq(2).click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').eq(2).type('120'); // Above 100 for bulk discount

    // Should apply bulk discount (10%) instead of loyalty discount (5%)
    cy.get('[data-cy="applied-scheme"]').eq(2).should('contain', 'Bulk Discount 10%');
    cy.get('input[formControlName="discountPercent"]').eq(2).should('have.value', '10');
    cy.get('[data-cy="item-discount-amount"]').eq(2).should('contain', '66.00'); // 120 * 5.50 * 0.10
    cy.get('[data-cy="item-total"]').eq(2).should('contain', '594.00'); // (120 * 5.50) - 66.00

    // Verify order totals with delivery charges and commission
    cy.get('[data-cy="subtotal"]').should('contain', '1,063.06'); // 261.25 + 207.81 + 594.00
    cy.get('[data-cy="total-discount"]').should('contain', '90.69'); // 13.75 + 10.94 + 66.00
    cy.get('[data-cy="tax-amount"]').should('contain', '146.73'); // (972.37) * 0.15
    cy.get('[data-cy="delivery-charges"]').should('contain', '100.00');
    cy.get('[data-cy="total-amount"]').should('contain', '1,219.10'); // 972.37 + 146.73 + 100.00
    cy.get('[data-cy="commission-amount"]').should('contain', '73.15'); // 1219.10 * 0.06

    // Add delivery address and notes
    cy.get('textarea[formControlName="deliveryAddress"]').type('123 Main Street, Lahore, Pakistan');
    cy.get('textarea[formControlName="notes"]').type('Urgent delivery required for medical emergency supplies');

    // Mock e-order creation API
    cy.intercept('POST', '**/e-orders', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'EO001',
          orderNumber: 'EO-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          salesmanId: 'SALES001',
          salesmanName: 'John Doe',
          orderDate: '2024-03-20',
          deliveryDate: '2024-03-25',
          priority: 'urgent',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 50, unitPrice: 5.50, schemeId: 'SCH002', schemeName: 'Loyalty Discount 5%', discountPercent: 5, discountAmount: 13.75, totalPrice: 261.25 },
            { itemId: 'ITEM002', itemName: 'Amoxicillin 250mg', quantity: 25, unitPrice: 8.75, schemeId: 'SCH002', schemeName: 'Loyalty Discount 5%', discountPercent: 5, discountAmount: 10.94, totalPrice: 207.81 },
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 120, unitPrice: 5.50, schemeId: 'SCH001', schemeName: 'Bulk Discount 10%', discountPercent: 10, discountAmount: 66.00, totalPrice: 594.00 }
          ],
          subtotal: 1063.06,
          totalDiscount: 90.69,
          taxAmount: 146.73,
          deliveryCharges: 100.00,
          totalAmount: 1219.10,
          commissionAmount: 73.15,
          commissionRate: 6,
          deliveryAddress: '123 Main Street, Lahore, Pakistan',
          notes: 'Urgent delivery required for medical emergency supplies',
          createdBy: 'salesman1'
        }
      }
    }).as('createEOrder');

    // Save the e-order
    cy.get('[data-cy="save-eorder-button"]').click();

    // Wait for API call and verify request
    cy.wait('@createEOrder').its('request.body').should('deep.include', {
      customerId: 'CUST001',
      salesmanId: 'SALES001',
      deliveryDate: '2024-03-25',
      priority: 'urgent',
      items: [
        { itemId: 'ITEM001', quantity: 50, unitPrice: 5.50, discountPercent: 5 },
        { itemId: 'ITEM002', quantity: 25, unitPrice: 8.75, discountPercent: 5 },
        { itemId: 'ITEM001', quantity: 120, unitPrice: 5.50, discountPercent: 10 }
      ],
      deliveryAddress: '123 Main Street, Lahore, Pakistan',
      notes: 'Urgent delivery required for medical emergency supplies'
    });

    // Verify success message and redirect
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'E-order created successfully');
    cy.url().should('include', '/e-orders/EO001');

    // Verify e-order details page shows correct information
    cy.get('[data-cy="order-number"]').should('contain', 'EO-2024-001');
    cy.get('[data-cy="order-status"]').should('contain', 'Draft');
    cy.get('[data-cy="customer-name"]').should('contain', 'Medical Store A');
    cy.get('[data-cy="salesman-name"]').should('contain', 'John Doe');
    cy.get('[data-cy="priority-badge"]').should('contain', 'Urgent');
    cy.get('[data-cy="total-amount"]').should('contain', '₨1,219.10');
    cy.get('[data-cy="commission-amount"]').should('contain', '₨73.15');
  });

  it('should submit e-order and handle approval workflow with status updates', () => {
    // Start with an existing draft e-order
    cy.intercept('GET', '**/e-orders/EO001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'EO001',
          orderNumber: 'EO-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          salesmanId: 'SALES001',
          salesmanName: 'John Doe',
          orderDate: '2024-03-20',
          deliveryDate: '2024-03-25',
          priority: 'urgent',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 50, unitPrice: 5.50, discountPercent: 5, discountAmount: 13.75, totalPrice: 261.25 }
          ],
          subtotal: 275.00,
          totalDiscount: 13.75,
          taxAmount: 39.56,
          deliveryCharges: 50.00,
          totalAmount: 350.81,
          commissionAmount: 21.05,
          createdBy: 'salesman1'
        }
      }
    }).as('getEOrder');

    // Navigate to existing e-order
    cy.visit('/e-orders/EO001');
    cy.wait('@getEOrder');

    // Verify initial status
    cy.get('[data-cy="order-status"]').should('contain', 'Draft');

    // Mock submit API
    cy.intercept('POST', '**/e-orders/EO001/submit', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'EO001',
          status: 'pending',
          submittedAt: '2024-03-20T10:00:00Z'
        }
      }
    }).as('submitEOrder');

    // Submit for approval
    cy.get('[data-cy="submit-approval-button"]').click();

    // Confirm submission
    cy.get('.mat-mdc-button').contains('Submit').click();

    cy.wait('@submitEOrder');

    // Verify status change
    cy.get('[data-cy="order-status"]').should('contain', 'Pending Approval');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'E-order submitted for approval');

    // Verify approval workflow (assuming manager access)
    cy.intercept('POST', '**/e-orders/EO001/approve', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'EO001',
          status: 'approved',
          approvedBy: 'manager',
          approvedDate: '2024-03-20T11:00:00Z'
        }
      }
    }).as('approveEOrder');

    // Approve the e-order
    cy.get('[data-cy="approve-button"]').click();
    cy.get('textarea[placeholder*="approval notes"]').type('Approved for urgent processing');
    cy.get('.mat-mdc-button').contains('Approve').click();

    cy.wait('@approveEOrder');

    // Verify approval
    cy.get('[data-cy="order-status"]').should('contain', 'Approved');
    cy.get('[data-cy="approved-by"]').should('contain', 'manager');
    cy.get('[data-cy="approved-date"]').should('exist');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'E-order approved successfully');
  });

  it('should process approved e-order with batch allocation and stock reservation', () => {
    // Start with an approved e-order
    cy.intercept('GET', '**/e-orders/EO001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'EO001',
          orderNumber: 'EO-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          salesmanId: 'SALES001',
          salesmanName: 'John Doe',
          orderDate: '2024-03-20',
          deliveryDate: '2024-03-25',
          priority: 'urgent',
          status: 'approved',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 50, unitPrice: 5.50, discountPercent: 5, discountAmount: 13.75, totalPrice: 261.25 }
          ],
          subtotal: 275.00,
          totalDiscount: 13.75,
          taxAmount: 39.56,
          deliveryCharges: 50.00,
          totalAmount: 350.81,
          approvedBy: 'manager',
          approvedDate: '2024-03-20T11:00:00Z'
        }
      }
    }).as('getApprovedEOrder');

    // Mock available batches API
    cy.intercept('GET', '**/e-orders/batches/available*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            batchNumber: 'BAT001',
            expiryDate: '2025-03-20',
            availableQuantity: 75,
            unitPrice: 5.50,
            location: 'Main Warehouse'
          },
          {
            batchNumber: 'BAT002',
            expiryDate: '2025-06-15',
            availableQuantity: 100,
            unitPrice: 5.75,
            location: 'Secondary Warehouse'
          }
        ]
      }
    }).as('getAvailableBatches');

    // Navigate to approved e-order
    cy.visit('/e-orders/EO001');
    cy.wait('@getApprovedEOrder');

    // Verify approved status
    cy.get('[data-cy="order-status"]').should('contain', 'Approved');

    // Click process order
    cy.get('[data-cy="process-order-button"]').click();

    // Verify available batches are shown
    cy.wait('@getAvailableBatches');
    cy.get('[data-cy="batch-option"]').should('have.length.at.least', 2);

    // Select batch for the item
    cy.get('[data-cy="batch-select"]').first().click();
    cy.get('mat-option').contains('BAT001').click();

    // Verify batch details are auto-filled
    cy.get('[data-cy="batch-expiry"]').should('contain', '2025-03-20');
    cy.get('[data-cy="batch-location"]').should('contain', 'Main Warehouse');

    // Add processing notes
    cy.get('textarea[formControlName="processNotes"]').type('Allocated from main warehouse stock with earliest expiry date');

    // Mock process API
    cy.intercept('POST', '**/e-orders/EO001/process', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'EO001',
          status: 'processing',
          processedBy: 'warehouse_manager',
          processedDate: '2024-03-20T14:00:00Z'
        }
      }
    }).as('processEOrder');

    // Submit processing
    cy.get('[data-cy="submit-processing-button"]').click();

    cy.wait('@processEOrder');

    // Verify status update
    cy.get('[data-cy="order-status"]').should('contain', 'Processing');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Order processed successfully');

    // Verify batch allocation is saved
    cy.get('[data-cy="allocated-batch"]').should('contain', 'BAT001');
    cy.get('[data-cy="processed-by"]').should('contain', 'warehouse_manager');
  });

  it('should complete delivery workflow and convert to invoice', () => {
    // Start with a processed e-order
    cy.intercept('GET', '**/e-orders/EO001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'EO001',
          orderNumber: 'EO-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          salesmanId: 'SALES001',
          salesmanName: 'John Doe',
          orderDate: '2024-03-20',
          deliveryDate: '2024-03-25',
          priority: 'urgent',
          status: 'ready',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 50, unitPrice: 5.50, discountPercent: 5, discountAmount: 13.75, totalPrice: 261.25, batchNumber: 'BAT001', expiryDate: '2025-03-20' }
          ],
          subtotal: 275.00,
          totalDiscount: 13.75,
          taxAmount: 39.56,
          deliveryCharges: 50.00,
          totalAmount: 350.81,
          processedBy: 'warehouse_manager',
          processedDate: '2024-03-20T14:00:00Z'
        }
      }
    }).as('getReadyEOrder');

    // Navigate to ready e-order
    cy.visit('/e-orders/EO001');
    cy.wait('@getReadyEOrder');

    // Verify ready status
    cy.get('[data-cy="order-status"]').should('contain', 'Ready for Delivery');

    // Assign delivery
    cy.get('[data-cy="assign-delivery-button"]').click();
    cy.get('select[formControlName="deliveryPerson"]').select('delivery_person_1');
    cy.get('input[formControlName="deliveryDate"]').should('have.value', '2024-03-25'); // Auto-filled
    cy.get('textarea[formControlName="deliveryNotes"]').type('Morning delivery slot assigned');

    // Mock assign delivery API
    cy.intercept('POST', '**/e-orders/EO001/assign-delivery', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'EO001',
          status: 'out_for_delivery',
          deliveredBy: 'delivery_person_1',
          deliveryDate: '2024-03-25'
        }
      }
    }).as('assignDelivery');

    cy.get('[data-cy="confirm-delivery-assignment"]').click();
    cy.wait('@assignDelivery');

    // Verify delivery assignment
    cy.get('[data-cy="order-status"]').should('contain', 'Out for Delivery');
    cy.get('[data-cy="delivered-by"]').should('contain', 'delivery_person_1');

    // Mark as delivered
    cy.get('[data-cy="mark-delivered-button"]').click();
    cy.get('input[formControlName="actualDeliveryDate"]').should('have.value', '2024-03-25');
    cy.get('textarea[formControlName="deliveryNotes"]').clear().type('Delivered successfully, customer signature obtained');
    cy.get('input[formControlName="customerSignature"]').type('Customer_Signature_Data');

    // Mock deliver API
    cy.intercept('POST', '**/e-orders/EO001/deliver', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'EO001',
          status: 'delivered',
          deliveredBy: 'delivery_person_1',
          deliveredDate: '2024-03-25T10:30:00Z'
        }
      }
    }).as('markDelivered');

    cy.get('[data-cy="confirm-delivery"]').click();
    cy.wait('@markDelivered');

    // Verify delivery completion
    cy.get('[data-cy="order-status"]').should('contain', 'Delivered');
    cy.get('[data-cy="delivered-date"]').should('exist');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Order delivered successfully');

    // Convert to invoice
    cy.get('[data-cy="convert-to-invoice-button"]').click();

    // Fill invoice details
    cy.get('input[formControlName="invoiceNumber"]').type('INV-2024-001');
    cy.get('input[formControlName="invoiceDate"]').type('2024-03-25');
    cy.get('input[formControlName="dueDate"]').type('2024-04-24');
    cy.get('select[formControlName="paymentTerms"]').select('Net 30');
    cy.get('textarea[formControlName="notes"]').type('Invoice generated from completed e-order delivery');

    // Mock invoice conversion API
    cy.intercept('POST', '**/e-orders/EO001/convert-to-invoice', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          invoiceId: 'INV001',
          eOrderId: 'EO001',
          totalAmount: 350.81,
          dueDate: '2024-04-24',
          convertedToInvoice: true,
          invoiceId: 'INV001'
        }
      }
    }).as('convertToInvoice');

    // Convert to invoice
    cy.get('[data-cy="submit-invoice-conversion-button"]').click();

    cy.wait('@convertToInvoice');

    // Verify invoice creation and workflow completion
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'E-order converted to invoice successfully');
    cy.url().should('include', '/invoices/INV001');

    // Verify e-order shows invoice conversion
    cy.visit('/e-orders/EO001');
    cy.get('[data-cy="order-status"]').should('contain', 'Delivered');
    cy.get('[data-cy="converted-to-invoice"]').should('contain', 'Yes');
    cy.get('[data-cy="invoice-reference"]').should('contain', 'INV-2024-001');
  });

  it('should validate data integrity throughout complete e-order workflow', () => {
    // Create e-order with specific values
    cy.intercept('POST', '**/e-orders', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'EO002',
          orderNumber: 'EO-2024-002',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          salesmanId: 'SALES001',
          salesmanName: 'John Doe',
          orderDate: '2024-03-20',
          deliveryDate: '2024-03-25',
          priority: 'normal',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 30, unitPrice: 5.50, discountPercent: 5, discountAmount: 8.25, totalPrice: 156.75 }
          ],
          subtotal: 165.00,
          totalDiscount: 8.25,
          taxAmount: 23.78,
          deliveryCharges: 50.00,
          totalAmount: 230.53,
          commissionAmount: 13.83,
          createdBy: 'salesman1'
        }
      }
    }).as('createEOrder2');

    // Create e-order
    cy.visit('/e-orders/new');
    cy.get('[data-cy="customer-select"]').click();
    cy.get('mat-option').contains('Medical Store A').click();
    cy.get('input[formControlName="deliveryDate"]').type('2024-03-25');
    cy.get('[data-cy="priority-select"]').click();
    cy.get('mat-option').contains('Normal').click();
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('30');
    cy.get('[data-cy="save-eorder-button"]').click();

    cy.wait('@createEOrder2');

    // Verify creation data integrity
    cy.get('[data-cy="order-number"]').should('contain', 'EO-2024-002');
    cy.get('[data-cy="total-amount"]').should('contain', '₨230.53');
    cy.get('[data-cy="commission-amount"]').should('contain', '₨13.83');
    cy.get('[data-cy="item-quantity"]').should('contain', '30');
    cy.get('[data-cy="item-unit-price"]').should('contain', '₨5.50');
    cy.get('[data-cy="item-discount"]').should('contain', '5%');

    // Submit and approve
    cy.intercept('POST', '**/e-orders/EO002/submit', {
      statusCode: 200,
      body: { success: true, data: { id: 'EO002', status: 'pending' } }
    }).as('submitEOrder2');

    cy.get('[data-cy="submit-approval-button"]').click();
    cy.get('.mat-mdc-button').contains('Submit').click();
    cy.wait('@submitEOrder2');

    cy.intercept('POST', '**/e-orders/EO002/approve', {
      statusCode: 200,
      body: { success: true, data: { id: 'EO002', status: 'approved', approvedBy: 'manager' } }
    }).as('approveEOrder2');

    cy.get('[data-cy="approve-button"]').click();
    cy.get('textarea').type('Approved');
    cy.get('.mat-mdc-button').contains('Approve').click();
    cy.wait('@approveEOrder2');

    // Process order
    cy.intercept('POST', '**/e-orders/EO002/process', {
      statusCode: 200,
      body: { success: true, data: { id: 'EO002', status: 'ready', processedBy: 'warehouse_manager' } }
    }).as('processEOrder2');

    cy.get('[data-cy="process-order-button"]').click();
    cy.get('[data-cy="batch-select"]').first().click();
    cy.get('mat-option').first().click();
    cy.get('[data-cy="submit-processing-button"]').click();
    cy.wait('@processEOrder2');

    // Assign and complete delivery
    cy.intercept('POST', '**/e-orders/EO002/assign-delivery', {
      statusCode: 200,
      body: { success: true, data: { id: 'EO002', status: 'out_for_delivery', deliveredBy: 'delivery_person_1' } }
    }).as('assignDelivery2');

    cy.get('[data-cy="assign-delivery-button"]').click();
    cy.get('select[formControlName="deliveryPerson"]').select('delivery_person_1');
    cy.get('[data-cy="confirm-delivery-assignment"]').click();
    cy.wait('@assignDelivery2');

    cy.intercept('POST', '**/e-orders/EO002/deliver', {
      statusCode: 200,
      body: { success: true, data: { id: 'EO002', status: 'delivered', deliveredBy: 'delivery_person_1' } }
    }).as('deliverEOrder2');

    cy.get('[data-cy="mark-delivered-button"]').click();
    cy.get('[data-cy="confirm-delivery"]').click();
    cy.wait('@deliverEOrder2');

    // Verify final data integrity
    cy.get('[data-cy="order-status"]').should('contain', 'Delivered');
    cy.get('[data-cy="total-amount"]').should('contain', '₨230.53'); // Should remain unchanged
    cy.get('[data-cy="commission-amount"]').should('contain', '₨13.83'); // Should remain unchanged
  });
});
