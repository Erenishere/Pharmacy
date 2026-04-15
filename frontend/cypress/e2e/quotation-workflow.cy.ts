describe('Quotation Complete Workflow E2E Tests', () => {
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
          },
          {
            id: 'CUST002',
            name: 'Pharma Plus',
            email: 'info@pharmacplus.com',
            phone: '+92-301-7654321',
            address: '456 Health Avenue, Karachi',
            city: 'Karachi',
            creditLimit: 75000,
            currentBalance: 0,
            isActive: true,
            loyaltyTier: 'platinum'
          }
        ]
      }
    }).as('getCustomers');

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

    // Login and navigate to quotations
    cy.visit('/login');
    cy.get('input[formControlName="username"]').type('salesman1');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
  });

  it('should create a quotation with discounts and calculate totals correctly', () => {
    // Navigate to quotations
    cy.visit('/quotations');
    cy.wait('@getCustomers');

    // Click create new quotation button
    cy.get('[data-cy="create-quotation-button"]').click();

    // Verify we're on the quotation creation page
    cy.url().should('include', '/quotations/new');

    // Fill quotation header information
    cy.get('[data-cy="customer-select"]').click();
    cy.get('mat-option').contains('Medical Store A').click();

    cy.get('input[formControlName="validUntil"]').type('2024-04-15');

    // Add first item with discount
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('100');
    cy.get('input[formControlName="unitPrice"]').first().should('have.value', '5.50'); // Auto-filled
    cy.get('input[formControlName="discountPercent"]').first().type('5'); // 5% discount
    cy.get('[data-cy="item-discount-amount"]').first().should('contain', '27.50'); // Calculated: 550 * 0.05
    cy.get('[data-cy="item-total"]').first().should('contain', '522.50'); // Calculated: 550 - 27.50

    // Add second item with higher discount
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').eq(1).click();
    cy.get('mat-option').contains('Amoxicillin 250mg').click();
    cy.get('input[formControlName="quantity"]').eq(1).type('50');
    cy.get('input[formControlName="unitPrice"]').eq(1).should('have.value', '8.75');
    cy.get('input[formControlName="discountPercent"]').eq(1).type('10'); // 10% discount
    cy.get('[data-cy="item-discount-amount"]').eq(1).should('contain', '43.75'); // Calculated: 437.50 * 0.10
    cy.get('[data-cy="item-total"]').eq(1).should('contain', '393.75'); // Calculated: 437.50 - 43.75

    // Add third item with no discount
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').eq(2).click();
    cy.get('mat-option').contains('Omeprazole 20mg').click();
    cy.get('input[formControlName="quantity"]').eq(2).type('25');
    cy.get('input[formControlName="unitPrice"]').eq(2).should('have.value', '12.50');
    cy.get('input[formControlName="discountPercent"]').eq(2).type('0'); // No discount
    cy.get('[data-cy="item-discount-amount"]').eq(2).should('contain', '0.00');
    cy.get('[data-cy="item-total"]').eq(2).should('contain', '312.50');

    // Verify quotation totals
    cy.get('[data-cy="subtotal"]').should('contain', '1,300.00'); // 550 + 437.50 + 312.50
    cy.get('[data-cy="total-discount"]').should('contain', '71.25'); // 27.50 + 43.75 + 0
    cy.get('[data-cy="tax-amount"]').should('contain', '183.19'); // (1300 - 71.25) * 0.15
    cy.get('[data-cy="total-amount"]').should('contain', '1,411.94'); // 1228.75 + 183.19

    // Add notes and terms
    cy.get('textarea[formControlName="notes"]').type('Special discount for bulk purchase and loyal customer');
    cy.get('textarea[formControlName="termsAndConditions"]').type('Payment within 30 days. Prices valid for 30 days.');

    // Mock quotation creation API
    cy.intercept('POST', '**/quotations', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q001',
          quotationNumber: 'QT-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          quotationDate: '2024-03-20',
          validUntil: '2024-04-15',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, discountPercent: 5, discountAmount: 27.50, totalPrice: 522.50 },
            { itemId: 'ITEM002', itemName: 'Amoxicillin 250mg', quantity: 50, unitPrice: 8.75, discountPercent: 10, discountAmount: 43.75, totalPrice: 393.75 },
            { itemId: 'ITEM003', itemName: 'Omeprazole 20mg', quantity: 25, unitPrice: 12.50, discountPercent: 0, discountAmount: 0, totalPrice: 312.50 }
          ],
          subtotal: 1300.00,
          totalDiscount: 71.25,
          taxAmount: 183.19,
          totalAmount: 1411.94,
          notes: 'Special discount for bulk purchase and loyal customer',
          termsAndConditions: 'Payment within 30 days. Prices valid for 30 days.',
          createdBy: 'salesman1'
        }
      }
    }).as('createQuotation');

    // Save the quotation
    cy.get('[data-cy="save-quotation-button"]').click();

    // Wait for API call and verify request
    cy.wait('@createQuotation').its('request.body').should('deep.include', {
      customerId: 'CUST001',
      validUntil: '2024-04-15',
      items: [
        { itemId: 'ITEM001', quantity: 100, unitPrice: 5.50, discountPercent: 5 },
        { itemId: 'ITEM002', quantity: 50, unitPrice: 8.75, discountPercent: 10 },
        { itemId: 'ITEM003', quantity: 25, unitPrice: 12.50, discountPercent: 0 }
      ],
      notes: 'Special discount for bulk purchase and loyal customer',
      termsAndConditions: 'Payment within 30 days. Prices valid for 30 days.'
    });

    // Verify success message and redirect
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Quotation created successfully');
    cy.url().should('include', '/quotations/Q001');

    // Verify quotation details page shows correct information
    cy.get('[data-cy="quotation-number"]').should('contain', 'QT-2024-001');
    cy.get('[data-cy="quotation-status"]').should('contain', 'Draft');
    cy.get('[data-cy="customer-name"]').should('contain', 'Medical Store A');
    cy.get('[data-cy="total-amount"]').should('contain', '₨1,411.94');
    cy.get('[data-cy="valid-until"]').should('contain', '2024-04-15');
  });

  it('should send quotation to customer and track email delivery', () => {
    // Start with an existing draft quotation
    cy.intercept('GET', '**/quotations/Q001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q001',
          quotationNumber: 'QT-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          customerEmail: 'contact@medicalstore.com',
          quotationDate: '2024-03-20',
          validUntil: '2024-04-15',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, discountPercent: 5, discountAmount: 27.50, totalPrice: 522.50 }
          ],
          subtotal: 550.00,
          totalDiscount: 27.50,
          taxAmount: 78.75,
          totalAmount: 601.25,
          createdBy: 'salesman1'
        }
      }
    }).as('getQuotation');

    // Navigate to existing quotation
    cy.visit('/quotations/Q001');
    cy.wait('@getQuotation');

    // Verify initial status
    cy.get('[data-cy="quotation-status"]').should('contain', 'Draft');

    // Click send quotation
    cy.get('[data-cy="send-quotation-button"]').click();

    // Fill email details
    cy.get('input[formControlName="emailSubject"]').should('have.value', 'Quotation QT-2024-001 from Medical Store A');
    cy.get('textarea[formControlName="emailMessage"]').should('contain', 'Please find attached quotation');

    // Customize email message
    cy.get('textarea[formControlName="emailMessage"]').clear().type('Dear Customer,\n\nPlease find attached our quotation for your medical supplies. We look forward to your business.\n\nBest regards,\nSales Team');

    // Mock send quotation API
    cy.intercept('POST', '**/quotations/Q001/send', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q001',
          status: 'sent',
          sentBy: 'salesman1',
          sentDate: '2024-03-20T14:00:00Z',
          emailSent: true,
          emailId: 'email_123'
        }
      }
    }).as('sendQuotation');

    // Send the quotation
    cy.get('[data-cy="confirm-send-button"]').click();

    cy.wait('@sendQuotation');

    // Verify status change
    cy.get('[data-cy="quotation-status"]').should('contain', 'Sent');
    cy.get('[data-cy="sent-by"]').should('contain', 'salesman1');
    cy.get('[data-cy="sent-date"]').should('exist');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Quotation sent successfully');

    // Verify email tracking
    cy.get('[data-cy="email-status"]').should('contain', 'Sent');
    cy.get('[data-cy="email-id"]').should('contain', 'email_123');
  });

  it('should handle quotation approval and conversion to invoice', () => {
    // Start with a sent quotation
    cy.intercept('GET', '**/quotations/Q001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q001',
          quotationNumber: 'QT-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          customerEmail: 'contact@medicalstore.com',
          quotationDate: '2024-03-20',
          validUntil: '2024-04-15',
          status: 'sent',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, discountPercent: 5, discountAmount: 27.50, totalPrice: 522.50 }
          ],
          subtotal: 550.00,
          totalDiscount: 27.50,
          taxAmount: 78.75,
          totalAmount: 601.25,
          sentBy: 'salesman1',
          sentDate: '2024-03-20T14:00:00Z',
          createdBy: 'salesman1'
        }
      }
    }).as('getSentQuotation');

    // Navigate to sent quotation
    cy.visit('/quotations/Q001');
    cy.wait('@getSentQuotation');

    // Verify sent status
    cy.get('[data-cy="quotation-status"]').should('contain', 'Sent');

    // Mock approval API (simulating customer approval)
    cy.intercept('POST', '**/quotations/Q001/approve', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q001',
          status: 'approved',
          approvedBy: 'customer_manager',
          approvedDate: '2024-03-21T09:00:00Z'
        }
      }
    }).as('approveQuotation');

    // Approve the quotation (assuming we have approval access)
    cy.get('[data-cy="approve-button"]').click();
    cy.get('textarea[placeholder*="approval notes"]').type('Approved for immediate purchase - good pricing');
    cy.get('.mat-mdc-button').contains('Approve').click();

    cy.wait('@approveQuotation');

    // Verify approval
    cy.get('[data-cy="quotation-status"]').should('contain', 'Approved');
    cy.get('[data-cy="approved-by"]').should('contain', 'customer_manager');
    cy.get('[data-cy="approved-date"]').should('exist');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Quotation approved successfully');

    // Now convert to invoice
    cy.get('[data-cy="convert-to-invoice-button"]').click();

    // Fill invoice details
    cy.get('input[formControlName="invoiceNumber"]').type('INV-2024-001');
    cy.get('input[formControlName="invoiceDate"]').type('2024-03-21');
    cy.get('input[formControlName="dueDate"]').type('2024-04-20');
    cy.get('select[formControlName="paymentTerms"]').select('Net 30');
    cy.get('textarea[formControlName="notes"]').type('Invoice generated from approved quotation QT-2024-001');

    // Mock invoice conversion API
    cy.intercept('POST', '**/quotations/Q001/convert-to-invoice', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          invoiceId: 'INV001',
          quotationId: 'Q001',
          totalAmount: 601.25,
          dueDate: '2024-04-20',
          status: 'created'
        }
      }
    }).as('convertToInvoice');

    // Convert to invoice
    cy.get('[data-cy="submit-invoice-conversion-button"]').click();

    cy.wait('@convertToInvoice');

    // Verify conversion
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Quotation converted to invoice successfully');
    cy.url().should('include', '/invoices/INV001');

    // Verify quotation status updated
    cy.visit('/quotations/Q001');
    cy.get('[data-cy="quotation-status"]').should('contain', 'Converted');
    cy.get('[data-cy="converted-to"]').should('contain', 'Invoice INV001');
    cy.get('[data-cy="converted-date"]').should('exist');
  });

  it('should handle quotation approval and conversion to e-order', () => {
    // Start with a sent quotation for e-order conversion
    cy.intercept('GET', '**/quotations/Q002', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q002',
          quotationNumber: 'QT-2024-002',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          quotationDate: '2024-03-20',
          validUntil: '2024-04-15',
          status: 'sent',
          items: [
            { itemId: 'ITEM002', itemName: 'Amoxicillin 250mg', quantity: 50, unitPrice: 8.75, discountPercent: 10, discountAmount: 43.75, totalPrice: 393.75 }
          ],
          subtotal: 437.50,
          totalDiscount: 43.75,
          taxAmount: 59.44,
          totalAmount: 453.19,
          sentBy: 'salesman1',
          sentDate: '2024-03-20T15:00:00Z',
          createdBy: 'salesman1'
        }
      }
    }).as('getSentQuotation2');

    // Navigate to quotation
    cy.visit('/quotations/Q002');
    cy.wait('@getSentQuotation2');

    // Approve quotation
    cy.intercept('POST', '**/quotations/Q002/approve', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q002',
          status: 'approved',
          approvedBy: 'customer_manager',
          approvedDate: '2024-03-21T10:00:00Z'
        }
      }
    }).as('approveQuotation2');

    cy.get('[data-cy="approve-button"]').click();
    cy.get('textarea').type('Approved - convert to e-order for immediate delivery');
    cy.get('.mat-mdc-button').contains('Approve').click();
    cy.wait('@approveQuotation2');

    // Convert to e-order
    cy.get('[data-cy="convert-to-eorder-button"]').click();

    // Fill e-order details
    cy.get('select[formControlName="salesmanId"]').select('SALES001');
    cy.get('input[formControlName="deliveryDate"]').type('2024-03-25');
    cy.get('select[formControlName="priority"]').select('normal');
    cy.get('textarea[formControlName="notes"]').type('E-order created from approved quotation - priority delivery requested');

    // Mock e-order conversion API
    cy.intercept('POST', '**/quotations/Q002/convert-to-eorder', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          eOrderId: 'EO001',
          quotationId: 'Q002',
          salesmanId: 'SALES001',
          totalAmount: 453.19,
          deliveryDate: '2024-03-25'
        }
      }
    }).as('convertToEOrder');

    // Convert to e-order
    cy.get('[data-cy="submit-eorder-conversion-button"]').click();

    cy.wait('@convertToEOrder');

    // Verify conversion
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Quotation converted to e-order successfully');
    cy.url().should('include', '/e-orders/EO001');

    // Verify quotation status updated
    cy.visit('/quotations/Q002');
    cy.get('[data-cy="quotation-status"]').should('contain', 'Converted');
    cy.get('[data-cy="converted-to"]').should('contain', 'E-Order EO001');
  });

  it('should validate data integrity throughout quotation workflow', () => {
    // Create quotation with specific values
    cy.intercept('POST', '**/quotations', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q003',
          quotationNumber: 'QT-2024-003',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          quotationDate: '2024-03-20',
          validUntil: '2024-04-15',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 50, unitPrice: 5.50, discountPercent: 5, discountAmount: 13.75, totalPrice: 261.25 }
          ],
          subtotal: 275.00,
          totalDiscount: 13.75,
          taxAmount: 39.56,
          totalAmount: 300.81,
          createdBy: 'salesman1'
        }
      }
    }).as('createQuotation3');

    // Create quotation
    cy.visit('/quotations/new');
    cy.get('[data-cy="customer-select"]').click();
    cy.get('mat-option').contains('Medical Store A').click();
    cy.get('input[formControlName="validUntil"]').type('2024-04-15');
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('50');
    cy.get('input[formControlName="discountPercent"]').first().type('5');
    cy.get('[data-cy="save-quotation-button"]').click();

    cy.wait('@createQuotation3');

    // Verify creation data integrity
    cy.get('[data-cy="quotation-number"]').should('contain', 'QT-2024-003');
    cy.get('[data-cy="total-amount"]').should('contain', '₨300.81');
    cy.get('[data-cy="item-quantity"]').should('contain', '50');
    cy.get('[data-cy="item-unit-price"]').should('contain', '₨5.50');
    cy.get('[data-cy="item-discount"]').should('contain', '5%');
    cy.get('[data-cy="item-total"]').should('contain', '₨261.25');

    // Send quotation
    cy.intercept('POST', '**/quotations/Q003/send', {
      statusCode: 200,
      body: {
        success: true,
        data: { id: 'Q003', status: 'sent', sentBy: 'salesman1', sentDate: '2024-03-20T14:00:00Z' }
      }
    }).as('sendQuotation3');

    cy.get('[data-cy="send-quotation-button"]').click();
    cy.get('[data-cy="confirm-send-button"]').click();
    cy.wait('@sendQuotation3');

    // Verify send data integrity
    cy.get('[data-cy="quotation-status"]').should('contain', 'Sent');
    cy.get('[data-cy="sent-by"]').should('contain', 'salesman1');
    cy.get('[data-cy="sent-date"]').should('exist');

    // Approve quotation
    cy.intercept('POST', '**/quotations/Q003/approve', {
      statusCode: 200,
      body: {
        success: true,
        data: { id: 'Q003', status: 'approved', approvedBy: 'customer_manager', approvedDate: '2024-03-21T09:00:00Z' }
      }
    }).as('approveQuotation3');

    cy.get('[data-cy="approve-button"]').click();
    cy.get('textarea').type('Approved');
    cy.get('.mat-mdc-button').contains('Approve').click();
    cy.wait('@approveQuotation3');

    // Verify approval data integrity
    cy.get('[data-cy="quotation-status"]').should('contain', 'Approved');
    cy.get('[data-cy="approved-by"]').should('contain', 'customer_manager');
    cy.get('[data-cy="approved-date"]').should('exist');

    // Convert to invoice
    cy.intercept('POST', '**/quotations/Q003/convert-to-invoice', {
      statusCode: 200,
      body: {
        success: true,
        data: { invoiceId: 'INV003', quotationId: 'Q003', totalAmount: 300.81, createdAt: '2024-03-21T10:00:00Z' }
      }
    }).as('convertToInvoice3');

    cy.get('[data-cy="convert-to-invoice-button"]').click();
    cy.get('input[formControlName="invoiceNumber"]').type('INV-2024-003');
    cy.get('input[formControlName="invoiceDate"]').type('2024-03-21');
    cy.get('input[formControlName="dueDate"]').type('2024-04-20');
    cy.get('[data-cy="submit-invoice-conversion-button"]').click();
    cy.wait('@convertToInvoice3');

    // Verify final conversion data integrity
    cy.get('[data-cy="invoice-number"]').should('contain', 'INV-2024-003');
    cy.get('[data-cy="invoice-total"]').should('contain', '₨300.81');
    cy.get('[data-cy="quotation-reference"]').should('contain', 'QT-2024-003');
    cy.get('[data-cy="converted-date"]').should('exist');
  });

  it('should handle workflow errors and edge cases gracefully', () => {
    // Test quotation creation with validation errors
    cy.visit('/quotations/new');

    // Try to save without required fields
    cy.get('[data-cy="save-quotation-button"]').click();

    // Should show validation errors
    cy.get('mat-error').should('contain', 'Customer is required');
    cy.get('mat-error').should('contain', 'Validity date is required');

    // Add customer but no items
    cy.get('[data-cy="customer-select"]').click();
    cy.get('mat-option').contains('Medical Store A').click();
    cy.get('input[formControlName="validUntil"]').type('2024-04-15');
    cy.get('[data-cy="save-quotation-button"]').click();

    cy.get('mat-error').should('contain', 'At least one item is required');

    // Add item but with invalid data
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('-5'); // Invalid quantity
    cy.get('input[formControlName="discountPercent"]').first().type('150'); // Invalid discount
    cy.get('[data-cy="save-quotation-button"]').click();

    cy.get('mat-error').should('contain', 'Quantity must be greater than 0');
    cy.get('mat-error').should('contain', 'Discount percentage must be between 0 and 100');

    // Test expired quotation handling
    cy.intercept('GET', '**/quotations/Q004', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q004',
          quotationNumber: 'QT-2024-004',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          quotationDate: '2024-02-01',
          validUntil: '2024-02-15', // Past date
          status: 'sent',
          items: [{ itemId: 'ITEM001', quantity: 25, unitPrice: 5.50, discountPercent: 0, discountAmount: 0, totalPrice: 137.50 }],
          totalAmount: 158.13
        }
      }
    });

    cy.visit('/quotations/Q004');

    // Should show expired warning
    cy.get('[data-cy="expired-warning"]').should('be.visible');
    cy.get('[data-cy="expired-warning"]').should('contain', 'This quotation has expired');

    // Convert button should be disabled for expired quotations
    cy.get('[data-cy="convert-to-invoice-button"]').should('be.disabled');

    // Test duplicate quotation functionality
    cy.intercept('POST', '**/quotations/Q001/duplicate', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q005',
          quotationNumber: 'QT-2024-005',
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
          totalAmount: 601.25
        }
      }
    }).as('duplicateQuotation');

    cy.visit('/quotations/Q001');
    cy.get('[data-cy="duplicate-quotation-button"]').click();

    cy.wait('@duplicateQuotation');

    // Should navigate to new duplicated quotation
    cy.url().should('include', '/quotations/Q005');
    cy.get('[data-cy="quotation-number"]').should('contain', 'QT-2024-005');
    cy.get('[data-cy="quotation-status"]').should('contain', 'Draft');
  });

  it('should maintain audit trail and traceability throughout workflow', () => {
    // Create and process a quotation to verify audit trail
    cy.intercept('POST', '**/quotations', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'Q006',
          quotationNumber: 'QT-2024-006',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          quotationDate: '2024-03-20',
          validUntil: '2024-04-15',
          status: 'draft',
          items: [{ itemId: 'ITEM001', quantity: 30, unitPrice: 5.50, discountPercent: 0, discountAmount: 0, totalPrice: 165.00 }],
          subtotal: 165.00,
          totalDiscount: 0,
          taxAmount: 24.75,
          totalAmount: 189.75,
          createdBy: 'salesman1',
          createdAt: '2024-03-20T08:00:00Z'
        }
      }
    });

    // Create quotation
    cy.visit('/quotations/new');
    cy.get('[data-cy="customer-select"]').click();
    cy.get('mat-option').contains('Medical Store A').click();
    cy.get('input[formControlName="validUntil"]').type('2024-04-15');
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('30');
    cy.get('[data-cy="save-quotation-button"]').click();

    // Verify creation audit
    cy.get('[data-cy="created-by"]').should('contain', 'salesman1');
    cy.get('[data-cy="created-at"]').should('exist');

    // Send quotation
    cy.intercept('POST', '**/quotations/Q006/send', {
      statusCode: 200,
      body: {
        success: true,
        data: { id: 'Q006', status: 'sent', sentBy: 'salesman1', sentDate: '2024-03-20T09:00:00Z' }
      }
    });
    cy.get('[data-cy="send-quotation-button"]').click();
    cy.get('[data-cy="confirm-send-button"]').click();

    // Verify send audit
    cy.get('[data-cy="sent-by"]').should('contain', 'salesman1');
    cy.get('[data-cy="sent-date"]').should('exist');

    // Approve quotation
    cy.intercept('POST', '**/quotations/Q006/approve', {
      statusCode: 200,
      body: {
        success: true,
        data: { id: 'Q006', status: 'approved', approvedBy: 'customer_manager', approvedDate: '2024-03-21T09:00:00Z' }
      }
    });
    cy.get('[data-cy="approve-button"]').click();
    cy.get('textarea').type('Approved');
    cy.get('.mat-mdc-button').contains('Approve').click();

    // Verify approval audit
    cy.get('[data-cy="approved-by"]').should('contain', 'customer_manager');
    cy.get('[data-cy="approved-date"]').should('exist');

    // Convert to e-order
    cy.intercept('POST', '**/quotations/Q006/convert-to-eorder', {
      statusCode: 200,
      body: {
        success: true,
        data: { eOrderId: 'EO002', quotationId: 'Q006', salesmanId: 'SALES001', createdAt: '2024-03-21T10:00:00Z' }
      }
    });
    cy.get('[data-cy="convert-to-eorder-button"]').click();
    cy.get('select[formControlName="salesmanId"]').select('SALES001');
    cy.get('input[formControlName="deliveryDate"]').type('2024-03-25');
    cy.get('[data-cy="submit-eorder-conversion-button"]').click();

    // Verify complete audit trail
    cy.get('[data-cy="audit-trail"]').within(() => {
      cy.get('[data-cy="creation-entry"]').should('exist');
      cy.get('[data-cy="send-entry"]').should('exist');
      cy.get('[data-cy="approval-entry"]').should('exist');
      cy.get('[data-cy="conversion-entry"]').should('exist');
    });

    // Verify quotation shows conversion details
    cy.visit('/quotations/Q006');
    cy.get('[data-cy="quotation-status"]').should('contain', 'Converted');
    cy.get('[data-cy="converted-to"]').should('contain', 'E-Order EO002');
    cy.get('[data-cy="converted-date"]').should('exist');
  });
});
