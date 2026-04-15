/**
 * Report Worker
 * Processes report generation and export jobs
 */

const reportQueue = require('../queues/reportQueue');
const reportService = require('../services/reportService');
const exportService = require('../services/exportService');
const emailService = require('../services/emailService');

console.log('[ReportWorker] Initializing...');

// Process generate-report jobs
reportQueue.process('generate-report', async (job) => {
  const { reportType, parameters, requestedBy } = job.data;
  
  console.log(`[ReportWorker] Generating ${reportType} report for ${requestedBy}`);
  
  try {
    // Update job progress
    job.progress(10);
    
    let result;
    
    switch (reportType) {
      case 'sales_summary':
        result = await reportService.generateSalesSummary(parameters);
        break;
      case 'inventory_status':
        result = await reportService.generateInventoryStatus(parameters);
        break;
      case 'customer_outstanding':
        result = await reportService.generateCustomerOutstanding(parameters);
        break;
      case 'financial_statement':
        result = await reportService.generateFinancialStatement(parameters);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
    
    job.progress(90);
    
    // Send notification to requester
    await emailService.sendReportReadyNotification({
      userId: requestedBy,
      reportType,
      downloadUrl: result.downloadUrl,
    });
    
    job.progress(100);
    
    return { 
      success: true, 
      reportId: result._id,
      downloadUrl: result.downloadUrl,
    };
  } catch (error) {
    console.error(`[ReportWorker] Failed to generate report:`, error);
    throw error;
  }
});

// Process export-data jobs
reportQueue.process('export-data', async (job) => {
  const { exportType, query, format, requestedBy } = job.data;
  
  console.log(`[ReportWorker] Exporting ${exportType} as ${format}`);
  
  try {
    job.progress(10);
    
    const result = await exportService.exportData({
      type: exportType,
      query,
      format,
      requestedBy,
    });
    
    job.progress(100);
    
    return {
      success: true,
      exportId: result._id,
      downloadUrl: result.downloadUrl,
      recordCount: result.recordCount,
    };
  } catch (error) {
    console.error(`[ReportWorker] Failed to export data:`, error);
    throw error;
  }
});

console.log('[ReportWorker] Ready');

module.exports = reportQueue;
