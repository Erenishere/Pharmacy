describe('Sales Returns Complete Workflow E2E Tests', () => {
  beforeEach(() => {
    // Login as customer service for full access
    cy.intercept('POST', '**/auth/login', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: { id: 1, username: 'customer_service', role: 'customer_service', permissions: ['read', 'write', 'returns'] }
        }
      }
    }).as('login');

    // Mock invoices API for return creation
    cy.intercept('GET', '**/sales/invoices*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'INV001',
            invoiceNumber: 'INV-2024-001',
            customerId: 'CUST001',
            customerName: 'Medical Store A',
            invoiceDate: '2024-03-15', // Within return policy (30 days)
            dueDate: '2024-04-14',
            paymentTerms: 'Net 30',
            status: 'paid',
            items: [
              {
                itemId: 'ITEM001',
                itemName: 'Paracetamol 500mg',
                quantity: 100,
                unitPrice: 5.50,
                discountPercent: 0,
                discountAmount: 0,
                taxPercent: 15,
                taxAmount: 82.50,
                totalPrice: 550.00
              },
              {
                itemId: 'ITEM002',
                itemName: 'Amoxicillin 250mg',
                quantity: 50,
                unitPrice: 8.75,
                discountPercent: 0,
                discountAmount: 0,
                taxPercent: 15,
                taxAmount: 65.63,
                totalPrice: 437.50
              }
            ],
            totalAmount: 987.50,
            paidAmount: 987.50,
            balanceAmount: 0
          }
        ]
      }
    }).as('getInvoices');

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
            creditLimit: 50000,
            currentBalance: 0,
            isActive: true
          }
        ]
      }
    }).as('getCustomers');

    // Login and navigate to sales returns
    cy.visit('/login');
    cy.get('input[formControlName="username"]').type('customer_service');
    cy.get('input[formControlName="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.wait('@login');
  });

  it('should create sales return with credit calculations and automatic validations', () => {
    // Navigate to sales returns
    cy.visit('/sales/returns');
    cy.wait('@getInvoices');

    // Click create new return button
    cy.get('[data-cy="create-return-button"]').click();

    // Verify we're on the return creation page
    cy.url().should('include', '/sales/returns/new');

    // Select invoice for return
    cy.get('[data-cy="invoice-select"]').click();
    cy.get('mat-option').contains('INV-2024-001').click();

    // Verify customer is auto-filled
    cy.get('[data-cy="customer-name"]').should('contain', 'Medical Store A');

    // Add first return item - damaged goods
    cy.get('[data-cy="add-return-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('10');
    cy.get('input[formControlName="unitPrice"]').first().should('have.value', '5.50'); // Auto-filled from invoice
    cy.get('[data-cy="return-reason-select"]').first().click();
    cy.get('mat-option').contains('Damaged').click();
    cy.get('[data-cy="condition-select"]').first().click();
    cy.get('mat-option').contains('Damaged').click();
    cy.get('input[formControlName="creditPercent"]').first().type('80'); // 80% credit for damaged goods

    // Verify credit calculations
    cy.get('[data-cy="item-credit-amount"]').first().should('contain', '44.00'); // 10 * 5.50 * 0.8
    cy.get('[data-cy="item-tax-credit"]').first().should('contain', '6.60'); // 44.00 * 0.15
    cy.get('[data-cy="item-total-credit"]').first().should('contain', '50.60'); // 44.00 + 6.60

    // Add second return item - wrong item, full credit
    cy.get('[data-cy="add-return-item-button"]').click();
    cy.get('[data-cy="item-select"]').eq(1).click();
    cy.get('mat-option').contains('Amoxicillin 250mg').click();
    cy.get('input[formControlName="quantity"]').eq(1).type('5');
    cy.get('input[formControlName="unitPrice"]').eq(1).should('have.value', '8.75');
    cy.get('[data-cy="return-reason-select"]').eq(1).click();
    cy.get('mat-option').contains('Wrong Item').click();
    cy.get('[data-cy="condition-select"]').eq(1).click();
    cy.get('mat-option').contains('Good').click();
    cy.get('input[formControlName="creditPercent"]').eq(1).type('100'); // 100% credit for wrong item

    // Verify credit calculations for second item
    cy.get('[data-cy="item-credit-amount"]').eq(1).should('contain', '43.75'); // 5 * 8.75 * 1.0
    cy.get('[data-cy="item-tax-credit"]').eq(1).should('contain', '6.56'); // 43.75 * 0.15
    cy.get('[data-cy="item-total-credit"]').eq(1).should('contain', '50.31'); // 43.75 + 6.56

    // Verify return totals
    cy.get('[data-cy="subtotal"]').should('contain', '118.75'); // 55 + 43.75
    cy.get('[data-cy="total-credit"]').should('contain', '87.75'); // 44.00 + 43.75
    cy.get('[data-cy="tax-credit"]').should('contain', '13.16'); // 6.60 + 6.56
    cy.get('[data-cy="net-credit"]').should('contain', '100.91'); // 87.75 + 13.16
    cy.get('[data-cy="processing-fees"]').should('contain', '5.05'); // 100.91 * 0.05
    cy.get('[data-cy="final-credit-amount"]').should('contain', '95.86'); // 100.91 - 5.05

    // Add return details
    cy.get('textarea[formControlName="notes"]').type('Customer returned damaged and wrong items. Damaged goods will be returned to stock.');
    cy.get('input[formControlName="referenceNumber"]').type('RET-CUST-2024-001');

    // Mock return creation API
    cy.intercept('POST', '**/sales/returns', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'RET001',
          returnNumber: 'RET-2024-001',
          invoiceId: 'INV001',
          invoiceNumber: 'INV-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          returnDate: '2024-03-20',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 10, unitPrice: 5.50, returnReason: 'damaged', condition: 'damaged', creditPercent: 80, creditAmount: 44.00, taxCreditAmount: 6.60, totalCredit: 50.60 },
            { itemId: 'ITEM002', itemName: 'Amoxicillin 250mg', quantity: 5, unitPrice: 8.75, returnReason: 'wrong_item', condition: 'good', creditPercent: 100, creditAmount: 43.75, taxCreditAmount: 6.56, totalCredit: 50.31 }
          ],
          subtotal: 118.75,
          totalCredit: 87.75,
          taxCredit: 13.16,
          netCredit: 100.91,
          processingFees: 5.05,
          finalCreditAmount: 95.86,
          notes: 'Customer returned damaged and wrong items. Damaged goods will be returned to stock.',
          referenceNumber: 'RET-CUST-2024-001',
          createdBy: 'customer_service'
        }
      }
    }).as('createReturn');

    // Save the return
    cy.get('[data-cy="save-return-button"]').click();

    // Wait for API call and verify request
    cy.wait('@createReturn').its('request.body').should('deep.include', {
      invoiceId: 'INV001',
      customerId: 'CUST001',
      items: [
        { itemId: 'ITEM001', quantity: 10, unitPrice: 5.50, returnReason: 'damaged', condition: 'damaged', creditPercent: 80 },
        { itemId: 'ITEM002', quantity: 5, unitPrice: 8.75, returnReason: 'wrong_item', condition: 'good', creditPercent: 100 }
      ],
      notes: 'Customer returned damaged and wrong items. Damaged goods will be returned to stock.',
      referenceNumber: 'RET-CUST-2024-001'
    });

    // Verify success message and redirect
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Return created successfully');
    cy.url().should('include', '/sales/returns/RET001');

    // Verify return details page shows correct information
    cy.get('[data-cy="return-number"]').should('contain', 'RET-2024-001');
    cy.get('[data-cy="return-status"]').should('contain', 'Draft');
    cy.get('[data-cy="invoice-reference"]').should('contain', 'INV-2024-001');
    cy.get('[data-cy="customer-name"]').should('contain', 'Medical Store A');
    cy.get('[data-cy="final-credit-amount"]').should('contain', '₨95.86');
    cy.get('[data-cy="return-date"]').should('exist');
  });

  it('should submit return and handle approval workflow with credit adjustments', () => {
    // Start with an existing draft return
    cy.intercept('GET', '**/sales/returns/RET001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'RET001',
          returnNumber: 'RET-2024-001',
          invoiceId: 'INV001',
          invoiceNumber: 'INV-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          returnDate: '2024-03-20',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 10, unitPrice: 5.50, returnReason: 'damaged', condition: 'damaged', creditPercent: 80, creditAmount: 44.00, taxCreditAmount: 6.60, totalCredit: 50.60 }
          ],
          subtotal: 55.00,
          totalCredit: 44.00,
          taxCredit: 6.60,
          netCredit: 50.60,
          processingFees: 2.53,
          finalCreditAmount: 48.07,
          createdBy: 'customer_service'
        }
      }
    }).as('getReturn');

    // Navigate to existing return
    cy.visit('/sales/returns/RET001');
    cy.wait('@getReturn');

    // Verify initial status
    cy.get('[data-cy="return-status"]').should('contain', 'Draft');

    // Mock submit API
    cy.intercept('POST', '**/sales/returns/RET001/submit', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'RET001',
          status: 'pending',
          submittedAt: '2024-03-20T10:00:00Z'
        }
      }
    }).as('submitReturn');

    // Submit for approval
    cy.get('[data-cy="submit-approval-button"]').click();

    // Confirm submission
    cy.get('.mat-mdc-button').contains('Submit').click();

    cy.wait('@submitReturn');

    // Verify status change
    cy.get('[data-cy="return-status"]').should('contain', 'Pending Approval');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Return submitted for approval');

    // Mock approval API with adjusted credit amounts
    cy.intercept('POST', '**/sales/returns/RET001/approve', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'RET001',
          status: 'approved',
          approvedBy: 'manager',
          approvedDate: '2024-03-20T11:00:00Z',
          items: [
            { itemId: 'ITEM001', approvedQuantity: 8, creditPercent: 70, creditAmount: 30.80, taxCreditAmount: 4.62, totalCredit: 35.42 } // Adjusted quantities and credit
          ],
          totalCredit: 30.80,
          taxCredit: 4.62,
          netCredit: 35.42,
          processingFees: 1.77,
          finalCreditAmount: 33.65
        }
      }
    }).as('approveReturn');

    // Approve the return with adjustments
    cy.get('[data-cy="approve-button"]').click();
    cy.get('input[formControlName="approvedQuantity"]').first().clear().type('8'); // Reduce quantity
    cy.get('input[formControlName="creditPercent"]').first().clear().type('70'); // Reduce credit percentage
    cy.get('textarea[placeholder*="approval notes"]').type('Approved with quantity reduction due to partial damage assessment');
    cy.get('.mat-mdc-button').contains('Approve').click();

    cy.wait('@approveReturn');

    // Verify approval with adjusted amounts
    cy.get('[data-cy="return-status"]').should('contain', 'Approved');
    cy.get('[data-cy="approved-by"]').should('contain', 'manager');
    cy.get('[data-cy="approved-date"]').should('exist');
    cy.get('[data-cy="final-credit-amount"]').should('contain', '₨33.65'); // Updated amount
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Return approved successfully');
  });

  it('should process approved return with stock return and inventory updates', () => {
    // Start with an approved return
    cy.intercept('GET', '**/sales/returns/RET001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'RET001',
          returnNumber: 'RET-2024-001',
          invoiceId: 'INV001',
          invoiceNumber: 'INV-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          returnDate: '2024-03-20',
          status: 'approved',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 8, unitPrice: 5.50, returnReason: 'damaged', condition: 'damaged', creditPercent: 70, creditAmount: 30.80, taxCreditAmount: 4.62, totalCredit: 35.42 }
          ],
          subtotal: 44.00,
          totalCredit: 30.80,
          taxCredit: 4.62,
          netCredit: 35.42,
          processingFees: 1.77,
          finalCreditAmount: 33.65,
          approvedBy: 'manager',
          approvedDate: '2024-03-20T11:00:00Z'
        }
      }
    }).as('getApprovedReturn');

    // Mock available batches for stock return
    cy.intercept('GET', '**/e-orders/batches/available*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            batchNumber: 'BAT001',
            expiryDate: '2025-03-20',
            availableQuantity: 50,
            unitPrice: 5.50,
            location: 'Main Warehouse'
          },
          {
            batchNumber: 'BAT002',
            expiryDate: '2025-06-15',
            availableQuantity: 30,
            unitPrice: 5.75,
            location: 'Secondary Warehouse'
          }
        ]
      }
    }).as('getAvailableBatches');

    // Navigate to approved return
    cy.visit('/sales/returns/RET001');
    cy.wait('@getApprovedReturn');

    // Verify approved status
    cy.get('[data-cy="return-status"]').should('contain', 'Approved');

    // Click process return
    cy.get('[data-cy="process-return-button"]').click();

    // Verify batch allocation for stock return
    cy.wait('@getAvailableBatches');
    cy.get('[data-cy="batch-option"]').should('have.length.at.least', 2);

    // Select batch for the returned item
    cy.get('[data-cy="batch-select"]').first().click();
    cy.get('mat-option').contains('BAT001').click();

    // Verify batch details
    cy.get('[data-cy="batch-expiry"]').should('contain', '2025-03-20');
    cy.get('[data-cy="batch-location"]').should('contain', 'Main Warehouse');

    // Set return condition and location
    cy.get('[data-cy="return-condition"]').first().should('contain', 'Damaged'); // Auto-filled
    cy.get('input[formControlName="returnLocation"]').first().type('Damaged Goods Warehouse');

    // Add processing notes
    cy.get('textarea[formControlName="processNotes"]').type('Items returned to damaged goods warehouse for quality inspection');

    // Mock process return API
    cy.intercept('POST', '**/sales/returns/RET001/process', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'RET001',
          status: 'processing',
          processedBy: 'warehouse_manager',
          processedDate: '2024-03-20T14:00:00Z'
        }
      }
    }).as('processReturn');

    // Submit processing
    cy.get('[data-cy="submit-processing-button"]').click();

    cy.wait('@processReturn');

    // Verify status update
    cy.get('[data-cy="return-status"]').should('contain', 'Processing');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Return processed successfully');

    // Verify stock return details
    cy.get('[data-cy="stock-return-details"]').within(() => {
      cy.get('[data-cy="returned-batch"]').should('contain', 'BAT001');
      cy.get('[data-cy="returned-quantity"]').should('contain', '8');
      cy.get('[data-cy="return-location"]').should('contain', 'Damaged Goods Warehouse');
    });
  });

  it('should complete return with credit note generation and customer balance update', () => {
    // Start with a processing return
    cy.intercept('GET', '**/sales/returns/RET001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'RET001',
          returnNumber: 'RET-2024-001',
          invoiceId: 'INV001',
          invoiceNumber: 'INV-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          returnDate: '2024-03-20',
          status: 'processing',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 8, unitPrice: 5.50, returnReason: 'damaged', condition: 'damaged', creditPercent: 70, creditAmount: 30.80, taxCreditAmount: 4.62, totalCredit: 35.42, batchNumber: 'BAT001' }
          ],
          subtotal: 44.00,
          totalCredit: 30.80,
          taxCredit: 4.62,
          netCredit: 35.42,
          processingFees: 1.77,
          finalCreditAmount: 33.65,
          processedBy: 'warehouse_manager',
          processedDate: '2024-03-20T14:00:00Z'
        }
      }
    }).as('getProcessingReturn');

    // Navigate to processing return
    cy.visit('/sales/returns/RET001');
    cy.wait('@getProcessingReturn');

    // Verify processing status
    cy.get('[data-cy="return-status"]').should('contain', 'Processing');

    // Click complete return
    cy.get('[data-cy="complete-return-button"]').click();

    // Select credit note as payment method
    cy.get('[data-cy="payment-method-select"]').click();
    cy.get('mat-option').contains('Credit Note').click();

    // Verify credit amount is auto-filled
    cy.get('input[formControlName="creditNoteAmount"]').should('have.value', '33.65');

    // Add completion notes
    cy.get('textarea[formControlName="completionNotes"]').type('Credit note issued for approved return. Customer can use for future purchases.');

    // Mock complete return API with credit note
    cy.intercept('POST', '**/sales/returns/RET001/complete', {
      statusCode: 200,
      body: {
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
          creditNote: {
            id: 'CN001',
            creditNoteNumber: 'CN-2024-001',
            returnId: 'RET001',
            customerId: 'CUST001',
            customerName: 'Medical Store A',
            amount: 33.65,
            issuedDate: '2024-03-21',
            expiryDate: '2025-03-21',
            status: 'active',
            usedAmount: 0,
            balanceAmount: 33.65,
            notes: 'Credit note for returned damaged goods'
          }
        }
      }
    }).as('completeReturn');

    // Complete the return
    cy.get('[data-cy="submit-completion-button"]').click();

    cy.wait('@completeReturn');

    // Verify completion
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Return completed successfully');
    cy.get('[data-cy="return-status"]').should('contain', 'Completed');
    cy.get('[data-cy="credit-note-number"]').should('contain', 'CN-2024-001');
    cy.get('[data-cy="payment-method"]').should('contain', 'Credit Note');

    // Verify credit note details
    cy.get('[data-cy="credit-note-details"]').within(() => {
      cy.get('[data-cy="credit-note-amount"]').should('contain', '₨33.65');
      cy.get('[data-cy="credit-note-balance"]').should('contain', '₨33.65');
      cy.get('[data-cy="credit-note-status"]').should('contain', 'Active');
      cy.get('[data-cy="credit-note-expiry"]').should('contain', '2025-03-21');
    });
  });

  it('should handle recovery requests and alternative payment methods', () => {
    // Start with a completed return
    cy.intercept('GET', '**/sales/returns/RET001', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'RET001',
          returnNumber: 'RET-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          status: 'completed',
          finalCreditAmount: 33.65,
          creditNoteId: 'CN001',
          paymentMethod: 'credit_note'
        }
      }
    }).as('getCompletedReturn');

    // Mock credit notes
    cy.intercept('GET', '**/sales/returns/credit-notes*', {
      statusCode: 200,
      body: {
        success: true,
        data: [
          {
            id: 'CN001',
            creditNoteNumber: 'CN-2024-001',
            returnId: 'RET001',
            customerId: 'CUST001',
            customerName: 'Medical Store A',
            amount: 33.65,
            issuedDate: '2024-03-21',
            expiryDate: '2025-03-21',
            status: 'active',
            usedAmount: 0,
            balanceAmount: 33.65
          }
        ]
      }
    }).as('getCreditNotes');

    // Navigate to completed return
    cy.visit('/sales/returns/RET001');
    cy.wait('@getCompletedReturn');

    // Verify completed status
    cy.get('[data-cy="return-status"]').should('contain', 'Completed');

    // Click create recovery request
    cy.get('[data-cy="create-recovery-button"]').click();

    // Fill recovery request - request refund instead of credit note
    cy.get('[data-cy="recovery-type-select"]').click();
    cy.get('mat-option').contains('Refund').click();
    cy.get('input[formControlName="recoveryAmount"]').should('have.value', '33.65'); // Auto-filled
    cy.get('[data-cy="recovery-priority-select"]').click();
    cy.get('mat-option').contains('Urgent').click();
    cy.get('textarea[formControlName="recoveryReason"]').type('Customer prefers immediate refund over credit note for cash flow reasons');

    // Mock recovery request API
    cy.intercept('POST', '**/sales/returns/RET001/recovery', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'REC001',
          returnId: 'RET001',
          recoveryType: 'refund',
          amount: 33.65,
          status: 'pending',
          priority: 'urgent'
        }
      }
    }).as('createRecovery');

    // Submit recovery request
    cy.get('[data-cy="submit-recovery-button"]').click();

    cy.wait('@createRecovery');

    // Verify recovery request creation
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Recovery request created successfully');

    // Mock recovery approval and processing
    cy.intercept('POST', '**/sales/returns/recovery/REC001/process', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'REC001',
          status: 'approved',
          processedBy: 'finance_manager',
          refundProcessed: true,
          refundDate: '2024-03-22T10:00:00Z'
        }
      }
    }).as('processRecovery');

    // Process recovery (assuming we have access)
    cy.get('[data-cy="process-recovery-button"]').click();
    cy.get('textarea[formControlName="processingNotes"]').type('Approved refund request. Processing immediate bank transfer.');
    cy.get('.mat-mdc-button').contains('Approve').click();

    cy.wait('@processRecovery');

    // Verify recovery processing
    cy.get('[data-cy="recovery-status"]').should('contain', 'Approved');
    cy.get('[data-cy="refund-date"]').should('exist');
    cy.get('.mat-mdc-snack-bar-container').should('contain', 'Recovery processed successfully');

    // Verify credit note is voided/adjusted
    cy.wait('@getCreditNotes');
    cy.get('[data-cy="credit-note-status"]').should('contain', 'Used'); // Or adjusted status
    cy.get('[data-cy="credit-note-balance"]').should('contain', '₨0.00');
  });

  it('should validate data integrity throughout complete return workflow', () => {
    // Create return with specific values
    cy.intercept('POST', '**/sales/returns', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          id: 'RET002',
          returnNumber: 'RET-2024-002',
          invoiceId: 'INV001',
          invoiceNumber: 'INV-2024-001',
          customerId: 'CUST001',
          customerName: 'Medical Store A',
          returnDate: '2024-03-20',
          status: 'draft',
          items: [
            { itemId: 'ITEM001', itemName: 'Paracetamol 500mg', quantity: 5, unitPrice: 5.50, returnReason: 'expired', condition: 'expired', creditPercent: 100, creditAmount: 27.50, taxCreditAmount: 4.13, totalCredit: 31.63 }
          ],
          subtotal: 27.50,
          totalCredit: 27.50,
          taxCredit: 4.13,
          netCredit: 31.63,
          processingFees: 1.58,
          finalCreditAmount: 30.05,
          createdBy: 'customer_service'
        }
      }
    }).as('createReturn2');

    // Create return
    cy.visit('/sales/returns/new');
    cy.get('[data-cy="invoice-select"]').click();
    cy.get('mat-option').contains('INV-2024-001').click();
    cy.get('[data-cy="add-return-item-button"]').click();
    cy.get('[data-cy="item-select"]').first().click();
    cy.get('mat-option').contains('Paracetamol 500mg').click();
    cy.get('input[formControlName="quantity"]').first().type('5');
    cy.get('[data-cy="return-reason-select"]').first().click();
    cy.get('mat-option').contains('Expired').click();
    cy.get('[data-cy="condition-select"]').first().click();
    cy.get('mat-option').contains('Expired').click();
    cy.get('input[formControlName="creditPercent"]').first().type('100');
    cy.get('[data-cy="save-return-button"]').click();

    cy.wait('@createReturn2');

    // Verify creation data integrity
    cy.get('[data-cy="return-number"]').should('contain', 'RET-2024-002');
    cy.get('[data-cy="final-credit-amount"]').should('contain', '₨30.05');
    cy.get('[data-cy="item-quantity"]').should('contain', '5');
    cy.get('[data-cy="item-condition"]').should('contain', 'Expired');
    cy.get('[data-cy="item-return-reason"]').should('contain', 'Expired');

    // Submit and approve
    cy.intercept('POST', '**/sales/returns/RET002/submit', {
      statusCode: 200,
      body: { success: true, data: { id: 'RET002', status: 'pending' } }
    }).as('submitReturn2');

    cy.get('[data-cy="submit-approval-button"]').click();
    cy.get('.mat-mdc-button').contains('Submit').click();
    cy.wait('@submitReturn2');

    cy.intercept('POST', '**/sales/returns/RET002/approve', {
      statusCode: 200,
      body: { success: true, data: { id: 'RET002', status: 'approved', approvedBy: 'manager', finalCreditAmount: 30.05 } }
    }).as('approveReturn2');

    cy.get('[data-cy="approve-button"]').click();
    cy.get('textarea').type('Approved');
    cy.get('.mat-mdc-button').contains('Approve').click();
    cy.wait('@approveReturn2');

    // Process and complete
    cy.intercept('POST', '**/sales/returns/RET002/process', {
      statusCode: 200,
      body: { success: true, data: { id: 'RET002', status: 'processing', processedBy: 'warehouse_manager' } }
    }).as('processReturn2');

    cy.get('[data-cy="process-return-button"]').click();
    cy.get('[data-cy="batch-select"]').first().click();
    cy.get('mat-option').first().click();
    cy.get('input[formControlName="returnLocation"]').first().type('Expired Goods Disposal');
    cy.get('[data-cy="submit-processing-button"]').click();
    cy.wait('@processReturn2');

    cy.intercept('POST', '**/sales/returns/RET002/complete', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          return: { id: 'RET002', status: 'completed', completedBy: 'accountant', paymentMethod: 'refund', refundAmount: 30.05, refundDate: '2024-03-22T10:00:00Z' }
        }
      }
    }).as('completeReturn2');

    cy.get('[data-cy="complete-return-button"]').click();
    cy.get('[data-cy="payment-method-select"]').click();
    cy.get('mat-option').contains('Refund').click();
    cy.get('[data-cy="submit-completion-button"]').click();
    cy.wait('@completeReturn2');

    // Verify final data integrity
    cy.get('[data-cy="return-status"]').should('contain', 'Completed');
    cy.get('[data-cy="payment-method"]').should('contain', 'Refund');
    cy.get('[data-cy="refund-amount"]').should('contain', '₨30.05');
    cy.get('[data-cy="final-credit-amount"]').should('contain', '₨30.05'); // Should remain unchanged
  });
});
