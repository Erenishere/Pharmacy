describe('Purchase Order Complete Workflow E2E Tests', () => {
  beforeEach(() => {
    // Login as admin for full access
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: { id: 1, username: 'admin', role: 'admin', permissions: ['read', 'write', 'admin'] }
        }
      }
    }).as('login');

    // Mock suppliers API
    cy.intercept('GET', '**/purchases/suppliers', {
      statusCode: 200,
      body: {
        success: true,
        data: [
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
        ]
      }
    }).as('getSuppliers');

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
          },
          {
            id: 'ITEM003',
            name: 'Omeprazole 20mg',
            genericName: 'Omeprazole',
            category: 'Digestive Health',
            packSize: '30 capsules',
            unitPrice: 12.50,
            currentStock: 75
          }
        ]
      }
    }).as('getItems');

    // Login and navigate to purchase orders
    cy.visit('/login');
    cy.get('input[formControlName="username"]').type('admin');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
  });

  it('should create a new purchase order with multiple items', () => {
    // Navigate to purchase orders
    cy.visit('/purchases/orders');
    cy.wait('@getSuppliers');

    // Click create new PO button
    cy.get('[data-cy="create-po-button"]').click();

    // Verify we're on the PO creation page
    cy.url().should('include', '/purchases/orders/new');

    // Fill PO header information
    cy.get('[data-cy="supplier-select"]').click();
    cy.get('mat-option').contains('Medical Suppliers Inc').click();

    cy.get('input[formControlName="expectedDate"]').type('2024-03-25');

    // Add first item
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('100');
    cy.get('input[formControlName="unitPrice"]').first().should('have.value', '5.50'); // Auto-filled
    cy.get('[data-cy="item-total"]').first().should('contain', '550.00'); // Calculated

    // Add second item
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').eq(1).click();
    cy.get('mat-option').contains('Amoxicillin 250mg').click();
    cy.get('input[formControlName="quantity"]').eq(1).type('50');
    cy.get('input[formControlName="unitPrice"]').eq(1).should('have.value', '8.75');
    cy.get('[data-cy="item-total"]').eq(1).should('contain', '437.50');

    // Add third item
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').eq(2).click();
    cy.get('mat-option').contains('Omeprazole 20mg').click();
    cy.get('input[formControlName="quantity"]').eq(2).type('25');
    cy.get('input[formControlName="unitPrice"]').eq(2).should('have.value', '12.50');
    cy.get('[data-cy="item-total"]').eq(2).should('contain', '312.50');

    // Verify order totals
    cy.get('[data-cy="subtotal"]').should('contain', '1,300.00');
    cy.get('[data-cy="tax-amount"]').should('contain', '195.00'); // 15% tax
    cy.get('[data-cy="total-amount"]').should('contain', '1,495.00');

    // Add notes
    cy.get('textarea[formControlName="notes"]').type('Urgent delivery required for Paracetamol stock shortage');

    // Mock PO creation API
    cy.intercept('POST', '**/purchases/orders', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'PO001',
          poNumber: 'PO-2024-001',
          supplierId: 'SUP001',
          supplierName: 'Medical Suppliers Inc',
          orderDate: '2024-03-20',
          expectedDate: '2024-03-25',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, totalPrice: 550.00 },
            { itemId: 'ITEM002', itemName: 'Amoxicillin 250mg', quantity: 50, unitPrice: 8.75, totalPrice: 437.50 },
            { itemId: 'ITEM003', itemName: 'Omeprazole 20mg', quantity: 25, unitPrice: 12.50, totalPrice: 312.50 }
          ],
          subtotal: 1300.00,
          taxAmount: 195.00,
          discountAmount: 0,
          totalAmount: 1495.00,
          notes: 'Urgent delivery required for Paracetamol stock shortage',
          createdBy: 'admin'
        }
      }
    }).as('createPO');

    // Save the PO
    cy.get('[data-cy="save-po-button"]').click();

    // Wait for API call and verify response
    cy.wait('@createPO').its('request.body').should('deep.include', {
      supplierId: 'SUP001',
      expectedDate: '2024-03-25',
      items: [
        { itemId: 'ITEM001', quantity: 100, unitPrice: 5.50 },
        { itemId: 'ITEM002', quantity: 50, unitPrice: 8.75 },
        { itemId: 'ITEM003', quantity: 25, unitPrice: 12.50 }
      ],
      notes: 'Urgent delivery required for Paracetamol stock shortage'
    });

    // Verify success message and redirect
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Purchase order created successfully');
    cy.url().should('include', '/purchases/orders/PO001');

    // Verify PO details page shows correct information
    cy.get('[data-cy="po-number"]').should('contain', 'PO-2024-001');
    cy.get('[data-cy="po-status"]').should('contain', 'Draft');
    cy.get('[data-cy="supplier-name"]').should('contain', 'Medical Suppliers Inc');
    cy.get('[data-cy="total-amount"]').should('contain', '₨1,495.00');
  });

  it('should submit PO for approval and handle approval workflow', () => {
    // Start with an existing draft PO
    cy.intercept('GET', '**/purchases/orders/PO001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'PO001',
          poNumber: 'PO-2024-001',
          supplierId: 'SUP001',
          supplierName: 'Medical Suppliers Inc',
          orderDate: '2024-03-20',
          expectedDate: '2024-03-25',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, totalPrice: 550.00 }
          ],
          subtotal: 550.00,
          taxAmount: 82.50,
          discountAmount: 0,
          totalAmount: 632.50,
          createdBy: 'admin'
        }
      }
    }).as('getPO');

    // Navigate to existing PO
    cy.visit('/purchases/orders/PO001');
    cy.wait('@getPO');

    // Verify initial status
    cy.get('[data-cy="po-status"]').should('contain', 'Draft');

    // Mock submit API
    cy.intercept('POST', '**/purchases/orders/PO001/submit', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'PO001',
          status: 'pending',
          submittedAt: '2024-03-20T10:00:00Z'
        }
      }
    }).as('submitPO');

    // Submit for approval
    cy.get('[data-cy="submit-approval-button"]').click();

    // Confirm submission
    cy.get('.mat-mdc-button').contains('Submit').click();

    cy.wait('@submitPO');

    // Verify status change
    cy.get('[data-cy="po-status"]').should('contain', 'Pending Approval');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Purchase order submitted for approval');

    // Mock approval API (as manager)
    cy.intercept('POST', '**/purchases/orders/PO001/approve', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'PO001',
          status: 'approved',
          approvedBy: 'manager',
          approvedDate: '2024-03-20T14:00:00Z'
        }
      }
    }).as('approvePO');

    // Approve the PO (assuming manager access)
    cy.get('[data-cy="approve-button"]').click();
    cy.get('textarea[placeholder*="approval notes"]').type('Approved for procurement');
    cy.get('.mat-mdc-button').contains('Approve').click();

    cy.wait('@approvePO');

    // Verify approval
    cy.get('[data-cy="po-status"]').should('contain', 'Approved');
    cy.get('[data-cy="approved-by"]').should('contain', 'manager');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Purchase order approved');
  });

  it('should receive approved PO and update inventory', () => {
    // Start with an approved PO
    cy.intercept('GET', '**/purchases/orders/PO001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'PO001',
          poNumber: 'PO-2024-001',
          supplierId: 'SUP001',
          supplierName: 'Medical Suppliers Inc',
          orderDate: '2024-03-20',
          expectedDate: '2024-03-25',
          status: 'approved',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, totalPrice: 550.00 }
          ],
          subtotal: 550.00,
          taxAmount: 82.50,
          discountAmount: 0,
          totalAmount: 632.50,
          approvedBy: 'manager',
          approvedDate: '2024-03-20T14:00:00Z'
        }
      }
    }).as('getApprovedPO');

    // Navigate to approved PO
    cy.visit('/purchases/orders/PO001');
    cy.wait('@getApprovedPO');

    // Verify approved status
    cy.get('[data-cy="po-status"]').should('contain', 'Approved');

    // Click receive goods
    cy.get('[data-cy="receive-goods-button"]').click();

    // Fill receipt details
    cy.get('input[formControlName="invoiceNumber"]').type('INV-2024-001');
    cy.get('input[formControlName="receivedDate"]').type('2024-03-25');

    // Fill item receipt details
    cy.get('[data-cy="received-quantity"]').type('95');
    cy.get('[data-cy="batch-number"]').type('BAT001');
    cy.get('[data-cy="expiry-date"]').type('2025-03-25');
    cy.get('[data-cy="receipt-notes"]').type('5 units damaged in transit');

    // Mock receive API
    cy.intercept('POST', '**/purchases/orders/PO001/receive', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'PO001',
          status: 'partial',
          receivedBy: 'warehouse_manager',
          receivedDate: '2024-03-25T09:00:00Z',
          invoiceNumber: 'INV-2024-001'
        }
      }
    }).as('receivePO');

    // Submit receipt
    cy.get('[data-cy="submit-receipt-button"]').click();

    cy.wait('@receivePO');

    // Verify status update
    cy.get('[data-cy="po-status"]').should('contain', 'Partially Received');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Goods received successfully');
  });

  it('should convert received PO to invoice and complete payment cycle', () => {
    // Start with a received PO
    cy.intercept('GET', '**/purchases/orders/PO001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'PO001',
          poNumber: 'PO-2024-001',
          supplierId: 'SUP001',
          supplierName: 'Medical Suppliers Inc',
          orderDate: '2024-03-20',
          expectedDate: '2024-03-25',
          status: 'received',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, totalPrice: 550.00 }
          ],
          subtotal: 550.00,
          taxAmount: 82.50,
          discountAmount: 0,
          totalAmount: 632.50,
          receivedBy: 'warehouse_manager',
          receivedDate: '2024-03-25T09:00:00Z',
          invoiceNumber: 'SUP-INV-001'
        }
      }
    }).as('getReceivedPO');

    // Navigate to received PO
    cy.visit('/purchases/orders/PO001');
    cy.wait('@getReceivedPO');

    // Verify received status
    cy.get('[data-cy="po-status"]').should('contain', 'Received');

    // Click convert to invoice
    cy.get('[data-cy="convert-invoice-button"]').click();

    // Fill invoice details
    cy.get('input[formControlName="invoiceNumber"]').type('INV-2024-001');
    cy.get('input[formControlName="invoiceDate"]').type('2024-03-25');
    cy.get('input[formControlName="dueDate"]').type('2024-04-24');
    cy.get('select[formControlName="paymentTerms"]').select('Net 30');
    cy.get('textarea[formControlName="notes"]').type('Payment due within 30 days');

    // Mock invoice conversion API
    cy.intercept('POST', '**/purchases/orders/PO001/convert-to-invoice', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          invoiceId: 'INV001',
          poId: 'PO001',
          totalAmount: 632.50,
          dueDate: '2024-04-24',
          status: 'pending_payment'
        }
      }
    }).as('convertToInvoice');

    // Submit invoice conversion
    cy.get('[data-cy="submit-invoice-button"]').click();

    cy.wait('@convertToInvoice');

    // Verify invoice creation
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Invoice created successfully');
    cy.url().should('include', '/purchases/invoices/INV001');

    // Navigate to invoice details
    cy.get('[data-cy="invoice-status"]').should('contain', 'Pending Payment');
    cy.get('[data-cy="invoice-total"]').should('contain', '₨632.50');

    // Mock payment processing
    cy.intercept('POST', '**/purchases/invoices/INV001/pay', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          invoiceId: 'INV001',
          status: 'paid',
          paymentDate: '2024-03-26',
          paymentMethod: 'bank_transfer'
        }
      }
    }).as('processPayment');

    // Process payment
    cy.get('[data-cy="pay-invoice-button"]').click();
    cy.get('select[formControlName="paymentMethod"]').select('Bank Transfer');
    cy.get('[data-cy="confirm-payment-button"]').click();

    cy.wait('@processPayment');

    // Verify payment completion
    cy.get('[data-cy="invoice-status"]').should('contain', 'Paid');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Payment processed successfully');
  });

  it('should validate data integrity throughout the workflow', () => {
    // Create PO with specific values
    cy.intercept('POST', '**/purchases/orders', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'PO002',
          poNumber: 'PO-2024-002',
          supplierId: 'SUP001',
          supplierName: 'Medical Suppliers Inc',
          orderDate: '2024-03-20',
          expectedDate: '2024-03-25',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 50, unitPrice: 5.50, totalPrice: 275.00 }
          ],
          subtotal: 275.00,
          taxAmount: 41.25,
          discountAmount: 0,
          totalAmount: 316.25,
          createdBy: 'admin'
        }
      }
    }).as('createPO2');

    // Create PO
    cy.visit('/purchases/orders/new');
    cy.get('[data-cy="supplier-select"]').click();
    cy.get('mat-option').contains('Medical Suppliers Inc').click();
    cy.get('input[formControlName="expectedDate"]').type('2024-03-25');
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('50');
    cy.get('[data-cy="save-po-button"]').click();

    cy.wait('@createPO2');

    // Verify PO creation data integrity
    cy.get('[data-cy="po-number"]').should('contain', 'PO-2024-002');
    cy.get('[data-cy="total-amount"]').should('contain', '₨316.25');
    cy.get('[data-cy="item-quantity"]').should('contain', '50');
    cy.get('[data-cy="item-unit-price"]').should('contain', '₨5.50');

    // Submit for approval
    cy.intercept('POST', '**/purchases/orders/PO002/submit', {
      statusCode: 200,
      body: { success: true, data: { id: 'PO002', status: 'pending' } }
    }).as('submitPO2');

    cy.get('[data-cy="submit-approval-button"]').click();
    cy.get('.mat-mdc-button').contains('Submit').click();
    cy.wait('@submitPO2');

    // Approve PO
    cy.intercept('POST', '**/purchases/orders/PO002/approve', {
      statusCode: 200,
      body: { success: true, data: { id: 'PO002', status: 'approved', approvedBy: 'manager' } }
    }).as('approvePO2');

    cy.get('[data-cy="approve-button"]').click();
    cy.get('textarea').type('Approved');
    cy.get('.mat-mdc-button').contains('Approve').click();
    cy.wait('@approvePO2');

    // Verify approval data integrity
    cy.get('[data-cy="po-status"]').should('contain', 'Approved');
    cy.get('[data-cy="approved-by"]').should('contain', 'manager');

    // Receive goods
    cy.intercept('POST', '**/purchases/orders/PO002/receive', {
      statusCode: 200,
      body: { success: true, data: { id: 'PO002', status: 'received', receivedBy: 'warehouse_manager' } }
    }).as('receivePO2');

    cy.get('[data-cy="receive-goods-button"]').click();
    cy.get('input[formControlName="invoiceNumber"]').type('INV-2024-002');
    cy.get('[data-cy="received-quantity"]').type('50');
    cy.get('[data-cy="batch-number"]').type('BAT002');
    cy.get('[data-cy="submit-receipt-button"]').click();
    cy.wait('@receivePO2');

    // Convert to invoice
    cy.intercept('POST', '**/purchases/orders/PO002/convert-to-invoice', {
      statusCode: 200,
      body: { success: true, data: { invoiceId: 'INV002', poId: 'PO002', totalAmount: 316.25 } }
    }).as('convertToInvoice2');

    cy.get('[data-cy="convert-invoice-button"]').click();
    cy.get('input[formControlName="invoiceNumber"]').type('INV-2024-002');
    cy.get('input[formControlName="invoiceDate"]').type('2024-03-25');
    cy.get('input[formControlName="dueDate"]').type('2024-04-24');
    cy.get('[data-cy="submit-invoice-button"]').click();
    cy.wait('@convertToInvoice2');

    // Verify final data integrity
    cy.get('[data-cy="invoice-number"]').should('contain', 'INV-2024-002');
    cy.get('[data-cy="invoice-total"]').should('contain', '₨316.25');
    cy.get('[data-cy="po-reference"]').should('contain', 'PO-2024-002');
  });

  it('should handle workflow errors and edge cases gracefully', () => {
    // Test PO creation with validation errors
    cy.visit('/purchases/orders/new');

    // Try to save without required fields
    cy.get('[data-cy="save-po-button"]').click();

    // Should show validation errors
    cy.get('mat-error').should('contain', 'Supplier is required');
    cy.get('mat-error').should('contain', 'Expected delivery date is required');

    // Add supplier but no items
    cy.get('[data-cy="supplier-select"]').click();
    cy.get('mat-option').contains('Medical Suppliers Inc').click();
    cy.get('input[formControlName="expectedDate"]').type('2024-03-25');
    cy.get('[data-cy="save-po-button"]').click();

    cy.get('mat-error').should('contain', 'At least one item is required');

    // Add item but with invalid data
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('-5'); // Invalid quantity
    cy.get('[data-cy="save-po-button"]').click();

    cy.get('mat-error').should('contain', 'Quantity must be greater than 0');

    // Test approval rejection workflow
    cy.intercept('GET', '**/purchases/orders/PO003', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'PO003',
          poNumber: 'PO-2024-003',
          status: 'pending',
          items: [{ itemId: 'ITEM001', quantity: 10, unitPrice: 5.50, totalPrice: 55.00 }],
          totalAmount: 63.25
        }
      }
    });

    cy.visit('/purchases/orders/PO003');

    // Mock rejection API
    cy.intercept('POST', '**/purchases/orders/PO003/reject', {
      statusCode: 200,
      body: {
        success: true,
        data: { id: 'PO003', status: 'rejected', rejectedBy: 'manager', rejectionReason: 'Budget constraints' }
      }
    }).as('rejectPO');

    // Reject the PO
    cy.get('[data-cy="reject-button"]').click();
    cy.get('textarea[placeholder*="reason"]').type('Budget constraints');
    cy.get('.mat-mdc-button').contains('Reject').click();

    cy.wait('@rejectPO');

    // Verify rejection
    cy.get('[data-cy="po-status"]').should('contain', 'Rejected');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Purchase order rejected');
  });

  it('should maintain audit trail and data traceability', () => {
    // Create and process a PO to verify audit trail
    cy.intercept('POST', '**/purchases/orders', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'PO004',
          poNumber: 'PO-2024-004',
          status: 'draft',
          createdBy: 'admin',
          createdAt: '2024-03-20T08:00:00Z',
          items: [{ itemId: 'ITEM001', quantity: 25, unitPrice: 5.50, totalPrice: 137.50 }],
          totalAmount: 158.13
        }
      }
    });

    // Create PO
    cy.visit('/purchases/orders/new');
    cy.get('[data-cy="supplier-select"]').click();
    cy.get('mat-option').contains('Medical Suppliers Inc').click();
    cy.get('input[formControlName="expectedDate"]').type('2024-03-25');
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('25');
    cy.get('[data-cy="save-po-button"]').click();

    // Verify creation audit info
    cy.get('[data-cy="created-by"]').should('contain', 'admin');
    cy.get('[data-cy="created-at"]').should('exist');

    // Submit for approval
    cy.intercept('POST', '**/purchases/orders/PO004/submit', {
      statusCode: 200,
      body: { success: true, data: { id: 'PO004', status: 'pending', submittedAt: '2024-03-20T09:00:00Z' } }
    });
    cy.get('[data-cy="submit-approval-button"]').click();
    cy.get('.mat-mdc-button').contains('Submit').click();

    // Verify submission audit
    cy.get('[data-cy="submitted-at"]').should('exist');

    // Approve
    cy.intercept('POST', '**/purchases/orders/PO004/approve', {
      statusCode: 200,
      body: { success: true, data: { id: 'PO004', status: 'approved', approvedBy: 'manager', approvedDate: '2024-03-20T10:00:00Z' } }
    });
    cy.get('[data-cy="approve-button"]').click();
    cy.get('textarea').type('Approved');
    cy.get('.mat-mdc-button').contains('Approve').click();

    // Verify approval audit
    cy.get('[data-cy="approved-by"]').should('contain', 'manager');
    cy.get('[data-cy="approved-date"]').should('exist');

    // Receive goods
    cy.intercept('POST', '**/purchases/orders/PO004/receive', {
      statusCode: 200,
      body: { success: true, data: { id: 'PO004', status: 'received', receivedBy: 'warehouse_manager', receivedDate: '2024-03-25T09:00:00Z' } }
    });
    cy.get('[data-cy="receive-goods-button"]').click();
    cy.get('input[formControlName="invoiceNumber"]').type('INV-2024-004');
    cy.get('[data-cy="received-quantity"]').type('25');
    cy.get('[data-cy="submit-receipt-button"]').click();

    // Verify receipt audit
    cy.get('[data-cy="received-by"]').should('contain', 'warehouse_manager');
    cy.get('[data-cy="received-date"]').should('exist');

    // Convert to invoice
    cy.intercept('POST', '**/purchases/orders/PO004/convert-to-invoice', {
      statusCode: 200,
      body: { success: true, data: { invoiceId: 'INV004', poId: 'PO004', createdAt: '2024-03-25T10:00:00Z' } }
    });
    cy.get('[data-cy="convert-invoice-button"]').click();
    cy.get('input[formControlName="invoiceNumber"]').type('INV-2024-004');
    cy.get('input[formControlName="invoiceDate"]').type('2024-03-25');
    cy.get('input[formControlName="dueDate"]').type('2024-04-24');
    cy.get('[data-cy="submit-invoice-button"]').click();

    // Verify complete audit trail
    cy.get('[data-cy="audit-trail"]').within(() => {
      cy.get('[data-cy="creation-entry"]').should('exist');
      cy.get('[data-cy="submission-entry"]').should('exist');
      cy.get('[data-cy="approval-entry"]').should('exist');
      cy.get('[data-cy="receipt-entry"]').should('exist');
      cy.get('[data-cy="invoice-entry"]').should('exist');
    });
  });
});
