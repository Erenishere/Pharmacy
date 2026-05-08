const express = require('express');
const accountHeadController = require('../controllers/accountHeadController');
const { authenticate, authorize } = require('../middleware/auth');
const { clearCacheMiddleware } = require('../middleware/cacheMiddleware');

const router = express.Router();
const clearAccountRegistrationLookupsCache = clearCacheMiddleware(['accounts:registration-lookups']);

router.use(authenticate);

router.route('/')
    .get(accountHeadController.getAllAccountHeads)
    .post(authorize(['admin', 'manager']), clearAccountRegistrationLookupsCache, accountHeadController.createAccountHead);

router.route('/:id')
    .get(accountHeadController.getAccountHeadById)
    .put(authorize(['admin', 'manager']), clearAccountRegistrationLookupsCache, accountHeadController.updateAccountHead)
    .delete(authorize(['admin']), clearAccountRegistrationLookupsCache, accountHeadController.deleteAccountHead);

module.exports = router;
