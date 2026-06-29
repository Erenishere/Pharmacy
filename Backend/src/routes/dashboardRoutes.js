const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const enhancedDashboardController = require('../controllers/enhancedDashboardController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Enhanced dashboard routes
router.get('/enhanced', authorize(['admin', 'accountant', 'manager']), enhancedDashboardController.getEnhancedDashboard.bind(enhancedDashboardController));
router.get('/sales-analytics', authorize(['admin', 'accountant', 'manager']), enhancedDashboardController.getSalesAnalytics.bind(enhancedDashboardController));
router.get('/inventory-performance', authorize(['admin', 'accountant', 'manager']), enhancedDashboardController.getInventoryPerformance.bind(enhancedDashboardController));
router.get('/customer-behavior', authorize(['admin', 'accountant', 'manager']), enhancedDashboardController.getCustomerBehavior.bind(enhancedDashboardController));
router.get('/operational-metrics', authorize(['admin', 'accountant', 'manager']), enhancedDashboardController.getOperationalMetrics.bind(enhancedDashboardController));
router.get('/financial-health', authorize(['admin', 'accountant', 'manager']), enhancedDashboardController.getFinancialHealth.bind(enhancedDashboardController));

// Get unified dashboard overview
router.get('/overview', authorize(['admin', 'accountant', 'manager']), dashboardController.getOverview);

// Get key performance indicators
router.get('/kpis', authorize(['admin', 'accountant', 'manager']), dashboardController.getKPIs);

// Get sales trend analysis
router.get('/sales-trend', authorize(['admin', 'accountant', 'manager']), dashboardController.getSalesTrend);

// Get top performing items
router.get('/top-items', authorize(['admin', 'accountant', 'manager']), dashboardController.getTopItems);

// Get top customers
router.get('/top-customers', authorize(['admin', 'accountant', 'manager']), dashboardController.getTopCustomers);

module.exports = router;
