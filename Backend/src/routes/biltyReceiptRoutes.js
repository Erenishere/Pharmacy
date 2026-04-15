const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/biltyReceiptController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const roles = ['admin', 'accountant', 'purchase', 'sales'];

router.get('/', authenticate, authorize(roles), ctrl.getAll);
router.post('/', authenticate, authorize(roles), ctrl.create);
router.get('/:id', authenticate, authorize(roles), ctrl.getById);
router.put('/:id', authenticate, authorize(roles), ctrl.update);
router.delete('/:id', authenticate, authorize(['admin', 'accountant']), ctrl.remove);

module.exports = router;
