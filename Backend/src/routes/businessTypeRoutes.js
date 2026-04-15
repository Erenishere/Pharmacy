const express = require('express');
const businessTypeController = require('../controllers/businessTypeController');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth.authenticate);

router.route('/').get(businessTypeController.getAllBusinessTypes).post(auth.authorize(['admin', 'manager']), businessTypeController.createBusinessType);
router.route('/:id').get(businessTypeController.getBusinessTypeById).put(auth.authorize(['admin', 'manager']), businessTypeController.updateBusinessType).delete(auth.authorize(['admin']), businessTypeController.deleteBusinessType);
router.patch('/:id/status', auth.authorize(['admin', 'manager']), businessTypeController.toggleBusinessTypeStatus);

module.exports = router;
