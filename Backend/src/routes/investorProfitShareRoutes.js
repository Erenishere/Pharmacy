const express = require('express');
const router = express.Router();
const controller = require('../controllers/investorProfitShareController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.post('/', authenticate, authorize(['admin', 'accountant']), controller.createProfitShare);
router.get('/', authenticate, authorize(['admin', 'accountant']), controller.getProfitShares);
router.get('/calculate', authenticate, authorize(['admin', 'accountant']), controller.calculateShares);
router.get('/:id', authenticate, authorize(['admin', 'accountant']), controller.getProfitShareById);
router.patch('/:id/distribute', authenticate, authorize(['admin']), controller.distributeProfitShare);
router.delete('/:id', authenticate, authorize(['admin']), controller.deleteProfitShare);

module.exports = router;
