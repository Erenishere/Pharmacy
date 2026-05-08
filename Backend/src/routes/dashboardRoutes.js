const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

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
