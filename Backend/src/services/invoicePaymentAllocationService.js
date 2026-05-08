const Invoice = require('../models/Invoice');

function getGrandTotal(invoice) {
  return Number(invoice?.totals?.grandTotal || invoice?.grandTotal || 0);
}

function getPaidAmount(invoice) {
  return Number(invoice?.totals?.paidAmount || invoice?.paidAmount || 0);
}

function getRemainingDue(invoice) {
  return Math.max(0, getGrandTotal(invoice) - getPaidAmount(invoice));
}

function getPaymentStatus(grandTotal, paidAmount) {
  if (grandTotal <= 0) return 'paid';
  if (paidAmount <= 0) return 'pending';
  if (paidAmount >= grandTotal) return 'paid';
  return 'partial';
}

function getReturnAmount(returnInvoice) {
  return Math.abs(Number(
    returnInvoice?.totals?.netBillTotal
    || returnInvoice?.totals?.grandTotal
    || returnInvoice?.grandTotal
    || 0,
  ));
}

function withSession(query, session) {
  if (session && query && typeof query.session === 'function') {
    return query.session(session);
  }
  return query;
}

function buildPaymentState(invoice, returnCreditAmount = 0) {
  const grandTotal = getGrandTotal(invoice);
  const paidAmount = getPaidAmount(invoice);
  const effectiveTotal = Math.max(0, grandTotal - Number(returnCreditAmount || 0));
  const dueAmount = Math.max(0, effectiveTotal - paidAmount);

  return {
    paidAmount,
    dueAmount,
    paymentStatus: getPaymentStatus(effectiveTotal, paidAmount),
  };
}

function validateAllocationAmount(invoice, allocation) {
  const amount = Number(allocation.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Allocation amount must be greater than 0');
  }

  const remainingDue = getRemainingDue(invoice);
  if (amount > remainingDue) {
    throw new Error(`Allocation amount exceeds remaining due for invoice ${invoice.invoiceNumber || invoice._id}`);
  }

  return amount;
}

async function applyInvoiceAllocations(allocations = [], options = {}) {
  const { session = null } = options;
  for (const allocation of allocations) {
    const invoice = await Invoice.findById(allocation.invoiceId).session(session);
    if (!invoice) continue;

    const amount = validateAllocationAmount(invoice, allocation);
    const grandTotal = getGrandTotal(invoice);
    const paidAmount = getPaidAmount(invoice) + amount;
    const dueAmount = Math.max(0, grandTotal - paidAmount);
    const paymentStatus = getPaymentStatus(grandTotal, paidAmount);

    const update = {
      'totals.paidAmount': paidAmount,
      'totals.dueAmount': dueAmount,
      paymentStatus,
    };

    if (paymentStatus === 'paid' && invoice.status !== 'cancelled') {
      update.status = 'paid';
    }

    await Invoice.findByIdAndUpdate(allocation.invoiceId, update, { session });
  }
}

async function reverseInvoiceAllocations(allocations = [], options = {}) {
  const { session = null } = options;
  for (const allocation of allocations) {
    const invoice = await Invoice.findById(allocation.invoiceId).session(session);
    if (!invoice) continue;

    const grandTotal = getGrandTotal(invoice);
    const paidAmount = Math.max(0, getPaidAmount(invoice) - Number(allocation.amount || 0));
    const dueAmount = Math.max(0, grandTotal - paidAmount);
    const paymentStatus = getPaymentStatus(grandTotal, paidAmount);

    const update = {
      'totals.paidAmount': paidAmount,
      'totals.dueAmount': dueAmount,
      paymentStatus,
    };

    if (invoice.status === 'paid' && paymentStatus !== 'paid') {
      update.status = 'confirmed';
    }

    await Invoice.findByIdAndUpdate(allocation.invoiceId, update, { session });
  }
}

async function applyReturnCreditToInvoice(returnInvoice, options = {}) {
  const { originalInvoice = null, session = null } = options;
  const invoice = originalInvoice || await withSession(
    Invoice.findById(returnInvoice.originalInvoiceId),
    session,
  );

  if (!invoice) return null;

  const returnType = invoice.type === 'purchase' ? 'return_purchase' : 'return_sales';
  const currentReturnId = returnInvoice._id?.toString();
  const confirmedReturns = await withSession(
    Invoice.find({
      originalInvoiceId: invoice._id,
      type: returnType,
      status: { $in: ['confirmed', 'paid'] },
    }),
    session,
  );

  let totalReturnCredit = (confirmedReturns || []).reduce(
    (sum, existingReturn) => sum + getReturnAmount(existingReturn),
    0,
  );

  const currentAlreadyCounted = (confirmedReturns || []).some(
    (existingReturn) => existingReturn._id?.toString() === currentReturnId,
  );

  if (!currentAlreadyCounted) {
    totalReturnCredit += getReturnAmount(returnInvoice);
  }

  const paymentState = buildPaymentState(invoice, totalReturnCredit);
  const update = {
    'totals.paidAmount': paymentState.paidAmount,
    'totals.dueAmount': paymentState.dueAmount,
    paymentStatus: paymentState.paymentStatus,
  };

  await Invoice.findByIdAndUpdate(invoice._id, update, { session });
  return update;
}

module.exports = {
  applyInvoiceAllocations,
  applyReturnCreditToInvoice,
  buildPaymentState,
  reverseInvoiceAllocations,
  getRemainingDue,
};
