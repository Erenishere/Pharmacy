const express = require('express');
const router = express.Router();
const routePlanController = require('../controllers/routePlanController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.post('/', authenticate, authorize(['admin', 'manager']), routePlanController.createRoutePlan);
router.get('/', authenticate, authorize(['admin', 'manager', 'salesman']), routePlanController.getRoutePlans);
router.get('/:id', authenticate, authorize(['admin', 'manager', 'salesman']), routePlanController.getRoutePlanById);
router.put('/:id', authenticate, authorize(['admin', 'manager']), routePlanController.updateRoutePlan);
router.delete('/:id', authenticate, authorize(['admin', 'manager']), routePlanController.deleteRoutePlan);

module.exports = router;
