/**
 * Ledger Worker
 * Processes ledger posting and financial update jobs
 */

const ledgerQueue = require('../queues/ledgerQueue');
const ledgerService = require('../services/ledgerService');
const customerService = require('../services/customerService');

console.log('[LedgerWorker] Initializing...');

// Process post-invoice jobs
ledgerQueue.process('post-invoice', async (job) => {
  const { invoiceId, invoiceNumber, type, customerId, totalAmount } = job.data;
  
  console.log(`[LedgerWorker] Posting invoice to ledger: ${invoiceNumber}`);
  
  try {
    const result = await ledgerService.postInvoice({
      invoiceId,
      type,
      customerId,
      amount: totalAmount,
      description: `Invoice ${invoiceNumber}`,
    });
    
    return { success: true, entryId: result._id };
  } catch (error) {
    console.error(`[LedgerWorker] Failed to post invoice:`, error);
    throw error;
  }
});

// Process post-receipt jobs
ledgerQueue.process('post-receipt', async (job) => {
  const { invoiceId, paymentAmount, customerId } = job.data;
  
  console.log(`[LedgerWorker] Posting receipt: ${paymentAmount}`);
  
  try {
    const result = await ledgerService.postReceipt({
      invoiceId,
      customerId,
      amount: paymentAmount,
      description: 'Payment received',
    });
    
    return { success: true, entryId: result._id };
  } catch (error) {
    console.error(`[LedgerWorker] Failed to post receipt:`, error);
    throw error;
  }
});

// Process update-customer-balance jobs
ledgerQueue.process('update-customer-balance', async (job) => {
  const { customerId, invoiceId, adjustment } = job.data;
  
  console.log(`[LedgerWorker] Updating customer balance: ${customerId}`);
  
  try {
    await customerService.updateBalance(customerId, adjustment);
    
    return { success: true, newBalance: adjustment };
  } catch (error) {
    console.error(`[LedgerWorker] Failed to update balance:`, error);
    throw error;
  }
});

console.log('[LedgerWorker] Ready');

module.exports = ledgerQueue;
