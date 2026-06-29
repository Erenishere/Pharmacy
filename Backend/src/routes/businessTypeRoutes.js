const express = require('express');
const businessTypeController = require('../controllers/businessTypeController');
const auth = require('../middleware/auth');
const { clearCacheMiddleware } = require('../middleware/cacheMiddleware');

const router = express.Router();
const clearItemRegistrationLookupsCache = clearCacheMiddleware(['items:registration-lookups']);
router.use(auth.authenticate);

router.route('/').get(businessTypeController.getAllBusinessTypes).post(auth.authorize(['admin', 'manager']), clearItemRegistrationLookupsCache, businessTypeController.createBusinessType);
router.route('/:id').get(businessTypeController.getBusinessTypeById).put(auth.authorize(['admin', 'manager']), clearItemRegistrationLookupsCache, businessTypeController.updateBusinessType).delete(auth.authorize(['admin']), clearItemRegistrationLookupsCache, businessTypeController.deleteBusinessType);
router.patch('/:id/status', auth.authorize(['admin', 'manager']), clearItemRegistrationLookupsCache, businessTypeController.toggleBusinessTypeStatus);

module.exports = router;
