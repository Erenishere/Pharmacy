const mongoose = require('mongoose');
const Invoice = require('../../models/Invoice');
const {
  applyReturnCreditToInvoice,
  buildPaymentState,
} = require('../invoicePaymentAllocationService');

jest.mock('../../models/Invoice');

describe('invoicePaymentAllocationService return credits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Invoice.find.mockResolvedValue([]);
    Invoice.findByIdAndUpdate.mockResolvedValue({});
  });

  it('reduces due amount for an unpaid invoice without changing paid amount', () => {
    const state = buildPaymentState(
      {
        totals: {
          grandTotal: 100,
          paidAmount: 0,
        },
      },
      20,
    );

    expect(state).toEqual({
      paidAmount: 0,
      dueAmount: 80,
      paymentStatus: 'pending',
    });
  });

  it('reduces due amount for a partially paid invoice without reversing payment allocation', () => {
    const state = buildPaymentState(
      {
        totals: {
          grandTotal: 100,
          paidAmount: 40,
        },
      },
      20,
    );

    expect(state).toEqual({
      paidAmount: 40,
      dueAmount: 40,
      paymentStatus: 'partial',
    });
  });

  it('keeps a fully paid invoice paid after a return credit', () => {
    const state = buildPaymentState(
      {
        totals: {
          grandTotal: 100,
          paidAmount: 100,
        },
      },
      20,
    );

    expect(state).toEqual({
      paidAmount: 100,
      dueAmount: 0,
      paymentStatus: 'paid',
    });
  });

  it('updates only payment fields when applying current and prior return credits', async () => {
    const invoiceId = new mongoose.Types.ObjectId();
    const currentReturnId = new mongoose.Types.ObjectId();
    const priorReturnId = new mongoose.Types.ObjectId();
    const originalInvoice = {
      _id: invoiceId,
      type: 'sales',
      status: 'confirmed',
      totals: {
        grandTotal: 100,
        paidAmount: 40,
      },
    };

    Invoice.find.mockResolvedValue([
      {
        _id: priorReturnId,
        totals: {
          netBillTotal: -10,
        },
      },
    ]);

    const update = await applyReturnCreditToInvoice(
      {
        _id: currentReturnId,
        originalInvoiceId: invoiceId,
        totals: {
          netBillTotal: -20,
        },
      },
      { originalInvoice },
    );

    expect(Invoice.find).toHaveBeenCalledWith({
      originalInvoiceId: invoiceId,
      type: 'return_sales',
      status: { $in: ['confirmed', 'paid'] },
    });
    expect(update).toEqual({
      'totals.paidAmount': 40,
      'totals.dueAmount': 30,
      paymentStatus: 'partial',
    });
    expect(Invoice.findByIdAndUpdate).toHaveBeenCalledWith(invoiceId, update, { session: null });
    expect(update).not.toHaveProperty('status');
  });
});
