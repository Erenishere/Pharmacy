/**
 * Email Worker
 * Processes email jobs from the email queue
 */

const emailQueue = require('../queues/emailQueue');
const emailService = require('../services/emailService');

console.log('[EmailWorker] Initializing...');

// Process send-invoice-email jobs
emailQueue.process('send-invoice-email', async (job) => {
  const { invoiceId, to, invoiceNumber, customerName } = job.data;
  
  console.log(`[EmailWorker] Sending invoice email for ${invoiceNumber} to ${to}`);
  
  try {
    const result = await emailService.sendInvoiceEmail({
      invoiceId,
      to,
      invoiceNumber,
      customerName,
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`[EmailWorker] Failed to send invoice email:`, error);
    throw error;
  }
});

// Process send-payment-receipt jobs
emailQueue.process('send-payment-receipt', async (job) => {
  const { invoiceId, to, amount, paymentDate } = job.data;
  
  console.log(`[EmailWorker] Sending payment receipt to ${to}`);
  
  try {
    const result = await emailService.sendPaymentReceipt({
      invoiceId,
      to,
      amount,
      paymentDate,
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`[EmailWorker] Failed to send payment receipt:`, error);
    throw error;
  }
});

// Process send-email jobs (generic)
emailQueue.process('send-email', async (job) => {
  const { template, to, data, subject } = job.data;
  
  console.log(`[EmailWorker] Sending ${template} email to ${to}`);
  
  try {
    const result = await emailService.sendTemplateEmail({
      template,
      to,
      subject,
      data,
    });
    
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`[EmailWorker] Failed to send email:`, error);
    throw error;
  }
});

console.log('[EmailWorker] Ready');

module.exports = emailQueue;
