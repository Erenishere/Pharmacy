describe('Sales Invoice Complete Workflow E2E Tests', () => {
  beforeEach(() => {
    // Login as accountant for full access
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: { id: 1, username: 'accountant1', role: 'accountant', permissions: ['read', 'write', 'accounting'] }
        }
      }
    }).as('login');

    // Mock customers API
    cy.intercept('GET', '**/sales/customers', {
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
            currentStock: 150,
            taxRate: 15
          },
          {
            id: 'ITEM002',
            name: 'Amoxicillin 250mg',
            genericName: 'Amoxicillin',
            category: 'Antibiotics',
            packSize: '100 capsules',
            unitPrice: 8.75,
            currentStock: 200,
            taxRate: 15
          },
          {
            id: 'ITEM003',
            name: 'Omeprazole 20mg',
            genericName: 'Omeprazole',
            category: 'Digestive Health',
            packSize: '30 capsules',
            unitPrice: 12.50,
            currentStock: 75,
            taxRate: 15
          }
        ]
      }
    }).as('getItems');

    // Login and navigate to sales invoices
    cy.visit('/login');
    cy.get('input[formControlName="username"]').type('accountant1');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
  });

  it('should create sales invoice with tax calculations and discount applications', () => {
    // Navigate to sales invoices
    cy.visit('/sales/invoices');
    cy.wait('@getCustomers');

    // Click create new invoice button
    cy.get('[data-cy="create-invoice-button"]').click();

    // Verify we're on the invoice creation page
    cy.url().should('include', '/sales/invoices/new');

    // Fill invoice header information
    cy.get('[data-cy="customer-select"]').click();
    cy.get('mat-option').contains('Medical Store A').click();

    cy.get('input[formControlName="dueDate"]').type('2024-04-19');
    cy.get('[data-cy="payment-terms-select"]').click();
    cy.get('mat-option').contains('Net 30').click();

    // Add first item with discount
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('100');
    cy.get('input[formControlName="unitPrice"]').first().should('have.value', '5.50'); // Auto-filled
    cy.get('input[formControlName="taxPercent"]').first().should('have.value', '15'); // Auto-filled
    cy.get('input[formControlName="discountPercent"]').first().type('5'); // 5% discount
    cy.get('[data-cy="item-discount-amount"]').first().should('contain', '27.50'); // Calculated: 550 * 0.05
    cy.get('[data-cy="item-tax-amount"]').first().should('contain', '78.75'); // Calculated: (550 - 27.50) * 0.15
    cy.get('[data-cy="item-total"]').first().should('contain', '601.25'); // Calculated: 550 - 27.50 + 78.75

    // Add second item with higher discount
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').eq(1).click();
    cy.get('mat-option').contains('Amoxicillin 250mg').click();
    cy.get('input[formControlName="quantity"]').eq(1).type('50');
    cy.get('input[formControlName="unitPrice"]').eq(1).should('have.value', '8.75');
    cy.get('input[formControlName="taxPercent"]').eq(1).should('have.value', '15');
    cy.get('input[formControlName="discountPercent"]').eq(1).type('10'); // 10% discount
    cy.get('[data-cy="item-discount-amount"]').eq(1).should('contain', '43.75'); // Calculated: 437.50 * 0.10
    cy.get('[data-cy="item-tax-amount"]').eq(1).should('contain', '56.44'); // Calculated: (437.50 - 43.75) * 0.15
    cy.get('[data-cy="item-total"]').eq(1).should('contain', '450.19'); // Calculated: 437.50 - 43.75 + 56.44

    // Add third item with no discount
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').eq(2).click();
    cy.get('mat-option').contains('Omeprazole 20mg').click();
    cy.get('input[formControlName="quantity"]').eq(2).type('25');
    cy.get('input[formControlName="unitPrice"]').eq(2).should('have.value', '12.50');
    cy.get('input[formControlName="taxPercent"]').eq(2).should('have.value', '15');
    cy.get('input[formControlName="discountPercent"]').eq(2).type('0'); // No discount
    cy.get('[data-cy="item-discount-amount"]').eq(2).should('contain', '0.00');
    cy.get('[data-cy="item-tax-amount"]').eq(2).should('contain', '46.88'); // Calculated: 312.50 * 0.15
    cy.get('[data-cy="item-total"]').eq(2).should('contain', '359.38'); // Calculated: 312.50 + 46.88

    // Add delivery charges
    cy.get('input[formControlName="deliveryCharges"]').type('100');

    // Verify invoice totals
    cy.get('[data-cy="subtotal"]').should('contain', '1,300.00'); // 550 + 437.50 + 312.50
    cy.get('[data-cy="total-discount"]').should('contain', '71.25'); // 27.50 + 43.75 + 0
    cy.get('[data-cy="total-tax"]').should('contain', '182.07'); // 78.75 + 56.44 + 46.88
    cy.get('[data-cy="delivery-charges"]').should('contain', '100.00');
    cy.get('[data-cy="total-amount"]').should('contain', '1,510.82'); // 1300 - 71.25 + 182.07 + 100
    cy.get('[data-cy="balance-amount"]').should('contain', '1,510.82'); // Same as total since no payments

    // Add notes and reference
    cy.get('textarea[formControlName="notes"]').type('Invoice for bulk medical supplies - priority delivery');
    cy.get('input[formControlName="referenceNumber"]').type('REF-BULK-2024-001');

    // Mock invoice creation API
    cy.intercept('POST', '**/sales/invoices', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV001',
          invoiceNumber: 'INV-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          invoiceDate: '2024-03-20',
          dueDate: '2024-04-19',
          paymentTerms: 'Net 30',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, discountPercent: 5, discountAmount: 27.50, taxPercent: 15, taxAmount: 78.75, totalPrice: 601.25 },
            { itemId: 'ITEM002', itemName: 'Amoxicillin 250mg', quantity: 50, unitPrice: 8.75, discountPercent: 10, discountAmount: 43.75, taxPercent: 15, taxAmount: 56.44, totalPrice: 450.19 },
            { itemId: 'ITEM003', itemName: 'Omeprazole 20mg', quantity: 25, unitPrice: 12.50, discountPercent: 0, discountAmount: 0, taxPercent: 15, taxAmount: 46.88, totalPrice: 359.38 }
          ],
          subtotal: 1300.00,
          totalDiscount: 71.25,
          totalTax: 182.07,
          deliveryCharges: 100.00,
          totalAmount: 1510.82,
          paidAmount: 0,
          balanceAmount: 1510.82,
          notes: 'Invoice for bulk medical supplies - priority delivery',
          referenceNumber: 'REF-BULK-2024-001',
          createdBy: 'accountant1'
        }
      }
    }).as('createInvoice');

    // Save the invoice
    cy.get('[data-cy="save-invoice-button"]').click();

    // Wait for API call and verify request
    cy.wait('@createInvoice').its('request.body').should('deep.include', {
      customerId: 'CUST001',
      dueDate: '2024-04-19',
      paymentTerms: 'Net 30',
      items: [
        { itemId: 'ITEM001', quantity: 100, unitPrice: 5.50, discountPercent: 5, taxPercent: 15 },
        { itemId: 'ITEM002', quantity: 50, unitPrice: 8.75, discountPercent: 10, taxPercent: 15 },
        { itemId: 'ITEM003', quantity: 25, unitPrice: 12.50, discountPercent: 0, taxPercent: 15 }
      ],
      deliveryCharges: 100,
      notes: 'Invoice for bulk medical supplies - priority delivery',
      referenceNumber: 'REF-BULK-2024-001'
    });

    // Verify success message and redirect
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Invoice created successfully');
    cy.url().should('include', '/sales/invoices/INV001');

    // Verify invoice details page shows correct information
    cy.get('[data-cy="invoice-number"]').should('contain', 'INV-2024-001');
    cy.get('[data-cy="invoice-status"]').should('contain', 'Draft');
    cy.get('[data-cy="customer-name"]').should('contain', 'Medical Store A');
    cy.get('[data-cy="total-amount"]').should('contain', '₨1,510.82');
    cy.get('[data-cy="balance-amount"]').should('contain', '₨1,510.82');
    cy.get('[data-cy="due-date"]').should('contain', '2024-04-19');
    cy.get('[data-cy="payment-terms"]').should('contain', 'Net 30');
  });

  it('should send invoice to customer and handle email delivery', () => {
    // Start with an existing draft invoice
    cy.intercept('GET', '**/sales/invoices/INV001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV001',
          invoiceNumber: 'INV-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          customerEmail: 'contact@medicalstore.com',
          invoiceDate: '2024-03-20',
          dueDate: '2024-04-19',
          paymentTerms: 'Net 30',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, discountPercent: 5, discountAmount: 27.50, taxPercent: 15, taxAmount: 78.75, totalPrice: 601.25 }
          ],
          subtotal: 550.00,
          totalDiscount: 27.50,
          totalTax: 78.75,
          deliveryCharges: 50.00,
          totalAmount: 651.25,
          paidAmount: 0,
          balanceAmount: 651.25,
          createdBy: 'accountant1'
        }
      }
    }).as('getInvoice');

    // Navigate to existing invoice
    cy.visit('/sales/invoices/INV001');
    cy.wait('@getInvoice');

    // Verify initial status
    cy.get('[data-cy="invoice-status"]').should('contain', 'Draft');

    // Click send invoice
    cy.get('[data-cy="send-invoice-button"]').click();

    // Fill email details
    cy.get('input[formControlName="emailSubject"]').should('have.value', 'Invoice INV-2024-001 from Medical Store A');
    cy.get('textarea[formControlName="emailMessage"]').should('contain', 'Please find attached invoice');

    // Customize email message
    cy.get('textarea[formControlName="emailMessage"]').clear().type('Dear Customer,\n\nPlease find attached invoice for your recent purchase. Payment is due within 30 days.\n\nThank you for your business.\n\nBest regards,\nAccounting Department');

    // Mock send invoice API
    cy.intercept('POST', '**/sales/invoices/INV001/send', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV001',
          status: 'sent',
          sentBy: 'accountant1',
          sentDate: '2024-03-20T14:00:00Z',
          emailSent: true,
          emailId: 'email_123'
        }
      }
    }).as('sendInvoice');

    // Send the invoice
    cy.get('[data-cy="confirm-send-button"]').click();

    cy.wait('@sendInvoice');

    // Verify status change
    cy.get('[data-cy="invoice-status"]').should('contain', 'Sent');
    cy.get('[data-cy="sent-by"]').should('contain', 'accountant1');
    cy.get('[data-cy="sent-date"]').should('exist');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Invoice sent successfully');

    // Verify email tracking
    cy.get('[data-cy="email-status"]').should('contain', 'Sent');
    cy.get('[data-cy="email-id"]').should('contain', 'email_123');
  });

  it('should process payments and update customer balance', () => {
    // Start with a sent invoice
    cy.intercept('GET', '**/sales/invoices/INV001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV001',
          invoiceNumber: 'INV-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          invoiceDate: '2024-03-20',
          dueDate: '2024-04-19',
          paymentTerms: 'Net 30',
          status: 'sent',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, discountPercent: 5, discountAmount: 27.50, taxPercent: 15, taxAmount: 78.75, totalPrice: 601.25 }
          ],
          subtotal: 550.00,
          totalDiscount: 27.50,
          totalTax: 78.75,
          deliveryCharges: 50.00,
          totalAmount: 651.25,
          paidAmount: 0,
          balanceAmount: 651.25,
          sentBy: 'accountant1',
          sentDate: '2024-03-20T14:00:00Z'
        }
      }
    }).as('getSentInvoice');

    // Navigate to sent invoice
    cy.visit('/sales/invoices/INV001');
    cy.wait('@getSentInvoice');

    // Verify initial payment status
    cy.get('[data-cy="paid-amount"]').should('contain', '₨0.00');
    cy.get('[data-cy="balance-amount"]').should('contain', '₨651.25');
    cy.get('[data-cy="payment-status"]').should('contain', 'Unpaid');

    // Click process payment
    cy.get('[data-cy="process-payment-button"]').click();

    // Fill payment details - partial payment
    cy.get('input[formControlName="amount"]').type('300.00');
    cy.get('[data-cy="payment-method-select"]').click();
    cy.get('mat-option').contains('Bank Transfer').click();
    cy.get('input[formControlName="paymentDate"]').should('have.value', new Date().toISOString().split('T')[0]);
    cy.get('input[formControlName="referenceNumber"]').type('BT-2024-001');
    cy.get('textarea[formControlName="notes"]').type('Partial payment via bank transfer');

    // Mock process payment API
    cy.intercept('POST', '**/sales/invoices/INV001/pay', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          invoice: {
            id: 'INV001',
            paidAmount: 300.00,
            balanceAmount: 351.25,
            status: 'sent'
          },
          transaction: {
            id: 'PAY001',
            invoiceId: 'INV001',
            amount: 300.00,
            paymentMethod: 'bank_transfer',
            paymentDate: '2024-03-25',
            referenceNumber: 'BT-2024-001',
            processedBy: 'accountant1'
          }
        }
      }
    }).as('processPayment');

    // Process the payment
    cy.get('[data-cy="submit-payment-button"]').click();

    cy.wait('@processPayment');

    // Verify payment update
    cy.get('[data-cy="paid-amount"]').should('contain', '₨300.00');
    cy.get('[data-cy="balance-amount"]').should('contain', '₨351.25');
    cy.get('[data-cy="payment-status"]').should('contain', 'Partial');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Payment processed successfully');

    // Process remaining payment
    cy.get('[data-cy="process-payment-button"]').click();
    cy.get('input[formControlName="amount"]').type('351.25');
    cy.get('[data-cy="payment-method-select"]').click();
    cy.get('mat-option').contains('Cash').click();
    cy.get('input[formControlName="paymentDate"]').should('have.value', new Date().toISOString().split('T')[0]);
    cy.get('input[formControlName="referenceNumber"]').type('CASH-2024-001');
    cy.get('textarea[formControlName="notes"]').type('Balance payment in cash');

    // Mock final payment API
    cy.intercept('POST', '**/sales/invoices/INV001/pay', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          invoice: {
            id: 'INV001',
            paidAmount: 651.25,
            balanceAmount: 0,
            status: 'paid',
            paidBy: 'accountant1',
            paidDate: '2024-03-26T10:00:00Z',
            paymentMethod: 'cash'
          },
          transaction: {
            id: 'PAY002',
            invoiceId: 'INV001',
            amount: 351.25,
            paymentMethod: 'cash',
            paymentDate: '2024-03-26',
            referenceNumber: 'CASH-2024-001',
            processedBy: 'accountant1'
          }
        }
      }
    }).as('processFinalPayment');

    // Process final payment
    cy.get('[data-cy="submit-payment-button"]').click();

    cy.wait('@processFinalPayment');

    // Verify final payment status
    cy.get('[data-cy="paid-amount"]').should('contain', '₨651.25');
    cy.get('[data-cy="balance-amount"]').should('contain', '₨0.00');
    cy.get('[data-cy="payment-status"]').should('contain', 'Paid');
    cy.get('[data-cy="invoice-status"]').should('contain', 'Paid');
    cy.get('[data-cy="paid-date"]').should('exist');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Payment processed successfully');
  });

  it('should generate receipt for completed payments', () => {
    // Start with a paid invoice
    cy.intercept('GET', '**/sales/invoices/INV001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV001',
          invoiceNumber: 'INV-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          invoiceDate: '2024-03-20',
          dueDate: '2024-04-19',
          paymentTerms: 'Net 30',
          status: 'paid',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, discountPercent: 5, discountAmount: 27.50, taxPercent: 15, taxAmount: 78.75, totalPrice: 601.25 }
          ],
          subtotal: 550.00,
          totalDiscount: 27.50,
          totalTax: 78.75,
          deliveryCharges: 50.00,
          totalAmount: 651.25,
          paidAmount: 651.25,
          balanceAmount: 0,
          paidBy: 'accountant1',
          paidDate: '2024-03-26T10:00:00Z',
          paymentMethod: 'cash'
        }
      }
    }).as('getPaidInvoice');

    // Mock payment transactions
    cy.intercept('GET', '**/sales/invoices/INV001/payments', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'PAY001',
            invoiceId: 'INV001',
            amount: 300.00,
            paymentMethod: 'bank_transfer',
            paymentDate: '2024-03-25',
            referenceNumber: 'BT-2024-001',
            notes: 'Partial payment',
            processedBy: 'accountant1'
          },
          {
            id: 'PAY002',
            invoiceId: 'INV001',
            amount: 351.25,
            paymentMethod: 'cash',
            paymentDate: '2024-03-26',
            referenceNumber: 'CASH-2024-001',
            notes: 'Balance payment',
            processedBy: 'accountant1'
          }
        ]
      }
    }).as('getPayments');

    // Navigate to paid invoice
    cy.visit('/sales/invoices/INV001');
    cy.wait('@getPaidInvoice');

    // Verify paid status
    cy.get('[data-cy="invoice-status"]').should('contain', 'Paid');

    // Click generate receipt
    cy.get('[data-cy="generate-receipt-button"]').click();

    // Fill receipt details
    cy.get('input[formControlName="receiptNumber"]').type('RCP-2024-001');
    cy.get('input[formControlName="receiptDate"]').should('have.value', new Date().toISOString().split('T')[0]);
    cy.get('input[formControlName="receivedBy"]').type('accountant1');
    cy.get('textarea[formControlName="notes"]').type('Receipt for full payment of invoice INV-2024-001');

    // Mock receipt generation API
    cy.intercept('POST', '**/sales/invoices/INV001/generate-receipt', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          receiptId: 'RCP001',
          receiptNumber: 'RCP-2024-001',
          invoiceId: 'INV001',
          totalAmount: 651.25,
          receiptDate: '2024-03-26',
          generatedBy: 'accountant1'
        }
      }
    }).as('generateReceipt');

    // Generate receipt
    cy.get('[data-cy="submit-receipt-button"]').click();

    cy.wait('@generateReceipt');

    // Verify receipt generation
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Receipt generated successfully');
    cy.get('[data-cy="receipt-number"]').should('contain', 'RCP-2024-001');
    cy.get('[data-cy="receipt-date"]').should('exist');

    // Verify payment history is displayed
    cy.wait('@getPayments');
    cy.get('[data-cy="payment-history"]').within(() => {
      cy.get('[data-cy="payment-entry"]').should('have.length', 2);
      cy.get('[data-cy="payment-amount"]').first().should('contain', '₨300.00');
      cy.get('[data-cy="payment-method"]').first().should('contain', 'Bank Transfer');
      cy.get('[data-cy="payment-amount"]').last().should('contain', '₨351.25');
      cy.get('[data-cy="payment-method"]').last().should('contain', 'Cash');
    });
  });

  it('should validate data integrity throughout invoice workflow', () => {
    // Create invoice with specific values
    cy.intercept('POST', '**/sales/invoices', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV002',
          invoiceNumber: 'INV-2024-002',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          invoiceDate: '2024-03-20',
          dueDate: '2024-04-19',
          paymentTerms: 'Net 30',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 50, unitPrice: 5.50, discountPercent: 5, discountAmount: 13.75, taxPercent: 15, taxAmount: 39.38, totalPrice: 300.63 }
          ],
          subtotal: 275.00,
          totalDiscount: 13.75,
          totalTax: 39.38,
          deliveryCharges: 50.00,
          totalAmount: 350.63,
          paidAmount: 0,
          balanceAmount: 350.63,
          createdBy: 'accountant1'
        }
      }
    }).as('createInvoice2');

    // Create invoice
    cy.visit('/sales/invoices/new');
    cy.get('[data-cy="customer-select"]').click();
    cy.get('mat-option').contains('Medical Store A').click();
    cy.get('input[formControlName="dueDate"]').type('2024-04-19');
    cy.get('[data-cy="payment-terms-select"]').click();
    cy.get('mat-option').contains('Net 30').click();
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('50');
    cy.get('input[formControlName="discountPercent"]').first().type('5');
    cy.get('input[formControlName="deliveryCharges"]').type('50');
    cy.get('[data-cy="save-invoice-button"]').click();

    cy.wait('@createInvoice2');

    // Verify creation data integrity
    cy.get('[data-cy="invoice-number"]').should('contain', 'INV-2024-002');
    cy.get('[data-cy="total-amount"]').should('contain', '₨350.63');
    cy.get('[data-cy="balance-amount"]').should('contain', '₨350.63');
    cy.get('[data-cy="item-quantity"]').should('contain', '50');
    cy.get('[data-cy="item-unit-price"]').should('contain', '₨5.50');
    cy.get('[data-cy="item-discount"]').should('contain', '5%');
    cy.get('[data-cy="item-tax"]').should('contain', '15%');

    // Send invoice
    cy.intercept('POST', '**/sales/invoices/INV002/send', {
      statusCode: 200,
      body: { success: true, data: { id: 'INV002', status: 'sent', sentBy: 'accountant1', sentDate: '2024-03-20T14:00:00Z' } }
    }).as('sendInvoice2');

    cy.get('[data-cy="send-invoice-button"]').click();
    cy.get('[data-cy="confirm-send-button"]').click();
    cy.wait('@sendInvoice2');

    // Verify send data integrity
    cy.get('[data-cy="invoice-status"]').should('contain', 'Sent');
    cy.get('[data-cy="sent-by"]').should('contain', 'accountant1');

    // Process full payment
    cy.intercept('POST', '**/sales/invoices/INV002/pay', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          invoice: { id: 'INV002', paidAmount: 350.63, balanceAmount: 0, status: 'paid', paidBy: 'accountant1', paidDate: '2024-03-26T10:00:00Z' },
          transaction: { id: 'PAY003', invoiceId: 'INV002', amount: 350.63, paymentMethod: 'cash', paymentDate: '2024-03-26', processedBy: 'accountant1' }
        }
      }
    }).as('payInvoice2');

    cy.get('[data-cy="process-payment-button"]').click();
    cy.get('input[formControlName="amount"]').type('350.63');
    cy.get('[data-cy="payment-method-select"]').click();
    cy.get('mat-option').contains('Cash').click();
    cy.get('[data-cy="submit-payment-button"]').click();
    cy.wait('@payInvoice2');

    // Verify payment data integrity
    cy.get('[data-cy="paid-amount"]').should('contain', '₨350.63');
    cy.get('[data-cy="balance-amount"]').should('contain', '₨0.00');
    cy.get('[data-cy="payment-status"]').should('contain', 'Paid');
    cy.get('[data-cy="invoice-status"]').should('contain', 'Paid');

    // Generate receipt
    cy.intercept('POST', '**/sales/invoices/INV002/generate-receipt', {
      statusCode: 200,
      body: { success: true, data: { receiptId: 'RCP002', receiptNumber: 'RCP-2024-002', invoiceId: 'INV002', totalAmount: 350.63 } }
    }).as('generateReceipt2');

    cy.get('[data-cy="generate-receipt-button"]').click();
    cy.get('input[formControlName="receiptNumber"]').type('RCP-2024-002');
    cy.get('input[formControlName="receivedBy"]').type('accountant1');
    cy.get('[data-cy="submit-receipt-button"]').click();
    cy.wait('@generateReceipt2');

    // Verify final data integrity
    cy.get('[data-cy="receipt-number"]').should('contain', 'RCP-2024-002');
    cy.get('[data-cy="total-amount"]').should('contain', '₨350.63'); // Should remain unchanged
    cy.get('[data-cy="paid-amount"]').should('contain', '₨350.63'); // Should remain unchanged
  });

  it('should handle workflow errors and edge cases gracefully', () => {
    // Test invoice creation with validation errors
    cy.visit('/sales/invoices/new');

    // Try to save without required fields
    cy.get('[data-cy="save-invoice-button"]').click();

    // Should show validation errors
    cy.get('mat-error').should('contain', 'Customer is required');
    cy.get('mat-error').should('contain', 'Due date is required');

    // Add customer but no items
    cy.get('[data-cy="customer-select"]').click();
    cy.get('mat-option').contains('Medical Store A').click();
    cy.get('input[formControlName="dueDate"]').type('2024-04-19');
    cy.get('[data-cy="save-invoice-button"]').click();

    cy.get('mat-error').should('contain', 'At least one item is required');

    // Add item but with invalid data
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('-5'); // Invalid quantity
    cy.get('input[formControlName="discountPercent"]').first().type('150'); // Invalid discount
    cy.get('input[formControlName="taxPercent"]').first().type('200'); // Invalid tax
    cy.get('[data-cy="save-invoice-button"]').click();

    cy.get('mat-error').should('contain', 'Quantity must be greater than 0');
    cy.get('mat-error').should('contain', 'Discount percentage must be between 0 and 100');
    cy.get('mat-error').should('contain', 'Tax percentage must be between 0 and 100');

    // Test overdue invoice handling
    cy.intercept('GET', '**/sales/invoices/INV003', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV003',
          invoiceNumber: 'INV-2024-003',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          invoiceDate: '2024-02-01',
          dueDate: '2024-02-15', // Past date
          paymentTerms: 'Net 15',
          status: 'sent',
          items: [{ itemId: 'ITEM001', quantity: 25, unitPrice: 5.50, discountPercent: 0, discountAmount: 0, taxPercent: 15, taxAmount: 20.63, totalPrice: 143.13 }],
          totalAmount: 168.75,
          paidAmount: 0,
          balanceAmount: 168.75
        }
      }
    });

    cy.visit('/sales/invoices/INV003');

    // Should show overdue warning
    cy.get('[data-cy="overdue-warning"]').should('be.visible');
    cy.get('[data-cy="overdue-warning"]').should('contain', 'This invoice is overdue');
    cy.get('[data-cy="invoice-status"]').should('contain', 'Overdue');

    // Test payment over amount
    cy.intercept('POST', '**/sales/invoices/INV001/pay', {
      statusCode: 400,
      body: {
        success: false,
        message: 'Payment amount cannot exceed outstanding balance'
      }
    }).as('overPayment');

    cy.visit('/sales/invoices/INV001');
    cy.get('[data-cy="process-payment-button"]').click();
    cy.get('input[formControlName="amount"]').type('1000'); // More than balance
    cy.get('[data-cy="payment-method-select"]').click();
    cy.get('mat-option').contains('Cash').click();
    cy.get('[data-cy="submit-payment-button"]').click();

    cy.wait('@overPayment');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Payment amount cannot exceed outstanding balance');

    // Test invoice cancellation
    cy.intercept('POST', '**/sales/invoices/INV001/cancel', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV001',
          status: 'cancelled',
          cancelledBy: 'accountant1',
          cancelledDate: '2024-03-26T12:00:00Z'
        }
      }
    }).as('cancelInvoice');

    cy.get('[data-cy="cancel-invoice-button"]').click();
    cy.get('textarea[placeholder*="cancellation reason"]').type('Customer requested cancellation due to order change');
    cy.get('.mat-mdc-button').contains('Cancel').click();

    cy.wait('@cancelInvoice');
    cy.get('[data-cy="invoice-status"]').should('contain', 'Cancelled');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Invoice cancelled successfully');
  });

  it('should convert quotation and e-order to invoices automatically', () => {
    // Test quotation to invoice conversion
    cy.intercept('POST', '**/sales/quotations/Q001/convert-to-invoice', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV004',
          invoiceNumber: 'INV-2024-004',
          convertedFrom: 'quotation',
          sourceId: 'Q001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          dueDate: '2024-04-19',
          paymentTerms: 'Net 30',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 100, unitPrice: 5.50, discountPercent: 5, discountAmount: 27.50, taxPercent: 15, taxAmount: 78.75, totalPrice: 601.25 }
          ],
          subtotal: 550.00,
          totalDiscount: 27.50,
          totalTax: 78.75,
          deliveryCharges: 50.00,
          totalAmount: 651.25,
          paidAmount: 0,
          balanceAmount: 651.25
        }
      }
    }).as('convertQuotation');

    // Navigate to quotation conversion (assuming there's a convert button)
    cy.visit('/quotations/Q001');
    cy.get('[data-cy="convert-to-invoice-button"]').click();
    cy.get('input[formControlName="dueDate"]').type('2024-04-19');
    cy.get('[data-cy="payment-terms-select"]').click();
    cy.get('mat-option').contains('Net 30').click();
    cy.get('[data-cy="convert-button"]').click();

    cy.wait('@convertQuotation');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Quotation converted to invoice successfully');
    cy.url().should('include', '/sales/invoices/INV004');

    // Verify conversion details
    cy.get('[data-cy="converted-from"]').should('contain', 'Quotation Q001');
    cy.get('[data-cy="invoice-number"]').should('contain', 'INV-2024-004');

    // Test e-order to invoice conversion
    cy.intercept('POST', '**/sales/e-orders/EO001/convert-to-invoice', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV005',
          invoiceNumber: 'INV-2024-005',
          convertedFrom: 'e-order',
          sourceId: 'EO001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          dueDate: '2024-04-19',
          paymentTerms: 'Net 30',
          status: 'draft',
          items: [
            { itemId: 'ITEM002', itemName: 'Amoxicillin 250mg', quantity: 50, unitPrice: 8.75, discountPercent: 10, discountAmount: 43.75, taxPercent: 15, taxAmount: 56.44, totalPrice: 450.19 }
          ],
          subtotal: 437.50,
          totalDiscount: 43.75,
          totalTax: 56.44,
          deliveryCharges: 100.00,
          totalAmount: 549.19,
          paidAmount: 0,
          balanceAmount: 549.19
        }
      }
    }).as('convertEOrder');

    // Navigate to e-order conversion
    cy.visit('/e-orders/EO001');
    cy.get('[data-cy="convert-to-invoice-button"]').click();
    cy.get('input[formControlName="dueDate"]').type('2024-04-19');
    cy.get('[data-cy="payment-terms-select"]').click();
    cy.get('mat-option').contains('Net 30').click();
    cy.get('[data-cy="convert-button"]').click();

    cy.wait('@convertEOrder');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'E-order converted to invoice successfully');
    cy.url().should('include', '/sales/invoices/INV005');

    // Verify e-order conversion details
    cy.get('[data-cy="converted-from"]').should('contain', 'E-Order EO001');
    cy.get('[data-cy="invoice-number"]').should('contain', 'INV-2024-005');
  });

  it('should maintain audit trail and traceability throughout workflow', () => {
    // Create and process an invoice to verify audit trail
    cy.intercept('POST', '**/sales/invoices', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'INV006',
          invoiceNumber: 'INV-2024-006',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          invoiceDate: '2024-03-20',
          dueDate: '2024-04-19',
          paymentTerms: 'Net 30',
          status: 'draft',
          items: [{ itemId: 'ITEM001', quantity: 30, unitPrice: 5.50, discountPercent: 5, discountAmount: 8.25, taxPercent: 15, taxAmount: 23.63, totalPrice: 143.13 }],
          subtotal: 165.00,
          totalDiscount: 8.25,
          totalTax: 23.63,
          deliveryCharges: 50.00,
          totalAmount: 230.38,
          paidAmount: 0,
          balanceAmount: 230.38,
          createdBy: 'accountant1',
          createdAt: '2024-03-20T08:00:00Z'
        }
      }
    });

    // Create invoice
    cy.visit('/sales/invoices/new');
    cy.get('[data-cy="customer-select"]').click();
    cy.get('mat-option').contains('Medical Store A').click();
    cy.get('input[formControlName="dueDate"]').type('2024-04-19');
    cy.get('[data-cy="add-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('30');
    cy.get('input[formControlName="discountPercent"]').first().type('5');
    cy.get('input[formControlName="deliveryCharges"]').type('50');
    cy.get('[data-cy="save-invoice-button"]').click();

    // Verify creation audit
    cy.get('[data-cy="created-by"]').should('contain', 'accountant1');
    cy.get('[data-cy="created-at"]').should('exist');

    // Send invoice
    cy.intercept('POST', '**/sales/invoices/INV006/send', {
      statusCode: 200,
      body: { success: true, data: { id: 'INV006', status: 'sent', sentBy: 'accountant1', sentDate: '2024-03-20T09:00:00Z' } }
    });
    cy.get('[data-cy="send-invoice-button"]').click();
    cy.get('[data-cy="confirm-send-button"]').click();

    // Verify send audit
    cy.get('[data-cy="sent-by"]').should('contain', 'accountant1');
    cy.get('[data-cy="sent-date"]').should('exist');

    // Process payment
    cy.intercept('POST', '**/sales/invoices/INV006/pay', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          invoice: { id: 'INV006', paidAmount: 230.38, balanceAmount: 0, status: 'paid', paidBy: 'accountant1', paidDate: '2024-03-26T10:00:00Z' },
          transaction: { id: 'PAY004', invoiceId: 'INV006', amount: 230.38, paymentMethod: 'cash', paymentDate: '2024-03-26', processedBy: 'accountant1' }
        }
      }
    });
    cy.get('[data-cy="process-payment-button"]').click();
    cy.get('input[formControlName="amount"]').type('230.38');
    cy.get('[data-cy="payment-method-select"]').click();
    cy.get('mat-option').contains('Cash').click();
    cy.get('[data-cy="submit-payment-button"]').click();

    // Verify payment audit
    cy.get('[data-cy="paid-by"]').should('contain', 'accountant1');
    cy.get('[data-cy="paid-date"]').should('exist');

    // Generate receipt
    cy.intercept('POST', '**/sales/invoices/INV006/generate-receipt', {
      statusCode: 200,
      body: { success: true, data: { receiptId: 'RCP003', receiptNumber: 'RCP-2024-003', invoiceId: 'INV006', totalAmount: 230.38 } }
    });
    cy.get('[data-cy="generate-receipt-button"]').click();
    cy.get('input[formControlName="receiptNumber"]').type('RCP-2024-003');
    cy.get('input[formControlName="receivedBy"]').type('accountant1');
    cy.get('[data-cy="submit-receipt-button"]').click();

    // Verify complete audit trail
    cy.get('[data-cy="audit-trail"]').within(() => {
      cy.get('[data-cy="creation-entry"]').should('exist');
      cy.get('[data-cy="send-entry"]').should('exist');
      cy.get('[data-cy="payment-entry"]').should('exist');
      cy.get('[data-cy="receipt-entry"]').should('exist');
    });

    // Verify invoice shows all audit information
    cy.get('[data-cy="invoice-status"]').should('contain', 'Paid');
    cy.get('[data-cy="total-amount"]').should('contain', '₨230.38'); // Should remain unchanged
    cy.get('[data-cy="paid-amount"]').should('contain', '₨230.38'); // Should remain unchanged
    cy.get('[data-cy="balance-amount"]').should('contain', '₨0.00'); // Should remain unchanged
  });
});
