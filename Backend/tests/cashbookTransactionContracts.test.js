jest.mock('mongoose', () => ({
  startSession: jest.fn(),
}));

jest.mock('../src/models/CashReceipt', () => ({
  create: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../src/models/CashPayment', () => ({
  create: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../src/models/Customer', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/Supplier', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/Invoice', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../src/services/ledgerService', () => ({
  createDoubleEntry: jest.fn(),
  reverseLedgerEntries: jest.fn(),
}));

jest.mock('../src/utils/counterService', () => ({
  nextSequence: jest.fn(),
}));

jest.mock('../src/services/cashAccountResolver', () => ({
  resolveCashAccount: jest.fn(),
}));

jest.mock('../src/services/invoicePaymentAllocationService', () => ({
  applyInvoiceAllocations: jest.fn(),
  reverseInvoiceAllocations: jest.fn(),
}));

const mongoose = require('mongoose');
const CashReceipt = require('../src/models/CashReceipt');
const CashPayment = require('../src/models/CashPayment');
const Customer = require('../src/models/Customer');
const Supplier = require('../src/models/Supplier');
const Invoice = require('../src/models/Invoice');
const ledgerService = require('../src/services/ledgerService');
const counterService = require('../src/utils/counterService');
const { resolveCashAccount } = require('../src/services/cashAccountResolver');
const {
  applyInvoiceAllocations,
  reverseInvoiceAllocations,
} = require('../src/services/invoicePaymentAllocationService');
const cashReceiptService = require('../src/services/cashReceiptService');
const cashPaymentService = require('../src/services/cashPaymentService');

const queryResult = (value) => ({
  session: jest.fn().mockResolvedValue(value),
});

const createSession = () => {
  const session = {
    withTransaction: jest.fn(async (callback) => callback()),
    endSession: jest.fn().mockResolvedValue(undefined),
  };
  mongoose.startSession.mockResolvedValue(session);
  return session;
};

describe('cashbook transaction contracts', () => {
  let session;

  beforeEach(() => {
    jest.clearAllMocks();
    session = createSession();
    counterService.nextSequence.mockResolvedValueOnce('CR-TEST-001').mockResolvedValueOnce('CP-TEST-001');
    resolveCashAccount.mockResolvedValue({ _id: 'cash-account-1' });
    ledgerService.createDoubleEntry.mockResolvedValue(undefined);
    ledgerService.reverseLedgerEntries.mockResolvedValue(undefined);
    applyInvoiceAllocations.mockResolvedValue(undefined);
    reverseInvoiceAllocations.mockResolvedValue(undefined);
  });

  it('posts a cash receipt allocation and ledger entry in the same MongoDB session', async () => {
    const invoice = {
      _id: 'invoice-1',
      invoiceNumber: 'SI-001',
      customerId: { toString: () => 'customer-1' },
    };
    const receipt = {
      _id: 'receipt-1',
      receiptNumber: 'CR-TEST-001',
      customerId: 'customer-1',
      cashAccountId: 'cash-account-1',
      amount: 750,
      notes: 'partial payment',
      invoiceAllocations: [{ invoiceId: 'invoice-1', amount: 750 }],
    };

    Customer.findById.mockReturnValue(queryResult({ _id: 'customer-1' }));
    Invoice.findById.mockReturnValue(queryResult(invoice));
    CashReceipt.create.mockResolvedValue([receipt]);

    await cashReceiptService.createReceipt({
      customerId: 'customer-1',
      amount: 750,
      paymentMethod: 'cash',
      invoiceAllocations: [{ invoiceId: 'invoice-1', amount: 750 }],
      createdBy: 'user-1',
    }, 'user-1');

    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(resolveCashAccount).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'cash' }),
      session,
    );
    expect(CashReceipt.create).toHaveBeenCalledWith(
      [expect.objectContaining({
        cashAccountId: 'cash-account-1',
        totalAllocated: 750,
        difference: 0,
      })],
      { session },
    );
    expect(applyInvoiceAllocations).toHaveBeenCalledWith(
      [{ invoiceId: 'invoice-1', amount: 750 }],
      { session },
    );
    expect(ledgerService.createDoubleEntry).toHaveBeenCalledWith(
      { accountId: 'cash-account-1', accountType: 'Account' },
      { accountId: 'customer-1', accountType: 'Customer' },
      750,
      expect.stringContaining('Cash Receipt CR-TEST-001'),
      'cash_receipt',
      'receipt-1',
      'user-1',
      { session },
    );
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('reverses receipt invoice allocations and ledger entries in the cancellation transaction', async () => {
    const receipt = {
      _id: 'receipt-1',
      status: 'cleared',
      createdBy: 'creator-1',
      invoiceAllocations: [{ invoiceId: 'invoice-1', amount: 500 }],
      save: jest.fn().mockResolvedValue(undefined),
    };
    CashReceipt.findById.mockReturnValue(queryResult(receipt));

    await cashReceiptService.cancelCashReceipt('receipt-1', 'user-1', 'duplicate receipt');

    expect(reverseInvoiceAllocations).toHaveBeenCalledWith(
      [{ invoiceId: 'invoice-1', amount: 500 }],
      { session },
    );
    expect(ledgerService.reverseLedgerEntries).toHaveBeenCalledWith(
      'cash_receipt',
      'receipt-1',
      'duplicate receipt',
      'user-1',
      { session },
    );
    expect(receipt.status).toBe('cancelled');
    expect(receipt.save).toHaveBeenCalledWith({ session });
  });

  it('propagates ledger failures so receipt creation can roll back', async () => {
    Customer.findById.mockReturnValue(queryResult({ _id: 'customer-1' }));
    CashReceipt.create.mockResolvedValue([{
      _id: 'receipt-1',
      receiptNumber: 'CR-TEST-001',
      customerId: 'customer-1',
      cashAccountId: 'cash-account-1',
      amount: 100,
      invoiceAllocations: [],
    }]);
    ledgerService.createDoubleEntry.mockRejectedValue(new Error('ledger write failed'));

    await expect(cashReceiptService.createReceipt({
      customerId: 'customer-1',
      amount: 100,
      paymentMethod: 'cash',
      createdBy: 'user-1',
    }, 'user-1')).rejects.toThrow('ledger write failed');

    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  it('posts supplier payments with allocation and ledger work in one session', async () => {
    const invoice = {
      _id: 'purchase-invoice-1',
      invoiceNumber: 'PI-001',
      supplierId: { toString: () => 'supplier-1' },
    };
    const payment = {
      _id: 'payment-1',
      paymentNumber: 'CP-TEST-001',
      supplierId: 'supplier-1',
      cashAccountId: 'cash-account-1',
      amount: 1200,
      notes: 'supplier payment',
      invoiceAllocations: [{ invoiceId: 'purchase-invoice-1', amount: 1200 }],
    };

    Supplier.findById.mockReturnValue(queryResult({ _id: 'supplier-1' }));
    Invoice.findById.mockReturnValue(queryResult(invoice));
    CashPayment.create.mockResolvedValue([payment]);

    await cashPaymentService.createPayment({
      supplierId: 'supplier-1',
      amount: 1200,
      paymentMethod: 'cash',
      invoiceAllocations: [{ invoiceId: 'purchase-invoice-1', amount: 1200 }],
      createdBy: 'user-1',
    }, 'user-1');

    expect(CashPayment.create).toHaveBeenCalledWith(
      [expect.objectContaining({
        cashAccountId: 'cash-account-1',
        totalAllocated: 1200,
        difference: 0,
      })],
      { session },
    );
    expect(applyInvoiceAllocations).toHaveBeenCalledWith(
      [{ invoiceId: 'purchase-invoice-1', amount: 1200 }],
      { session },
    );
    expect(ledgerService.createDoubleEntry).toHaveBeenCalledWith(
      { accountId: 'supplier-1', accountType: 'Supplier' },
      { accountId: 'cash-account-1', accountType: 'Account' },
      1200,
      expect.stringContaining('Cash Payment CP-TEST-001'),
      'cash_payment',
      'payment-1',
      'user-1',
      { session },
    );
  });

  it('reverses payment invoice allocations and ledger entries in the cancellation transaction', async () => {
    const payment = {
      _id: 'payment-1',
      status: 'cleared',
      createdBy: 'creator-1',
      invoiceAllocations: [{ invoiceId: 'purchase-invoice-1', amount: 1200 }],
      save: jest.fn().mockResolvedValue(undefined),
    };
    CashPayment.findById.mockReturnValue(queryResult(payment));

    await cashPaymentService.cancelCashPayment('payment-1', 'user-1', 'wrong supplier');

    expect(reverseInvoiceAllocations).toHaveBeenCalledWith(
      [{ invoiceId: 'purchase-invoice-1', amount: 1200 }],
      { session },
    );
    expect(ledgerService.reverseLedgerEntries).toHaveBeenCalledWith(
      'cash_payment',
      'payment-1',
      'wrong supplier',
      'user-1',
      { session },
    );
    expect(payment.status).toBe('cancelled');
    expect(payment.save).toHaveBeenCalledWith({ session });
  });
});
