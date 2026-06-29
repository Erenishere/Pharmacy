const express = require('express');
const formulaController = require('../controllers/formulaController');
const auth = require('../middleware/auth');
const { clearCacheMiddleware } = require('../middleware/cacheMiddleware');

const router = express.Router();
const clearItemRegistrationLookupsCache = clearCacheMiddleware(['items:registration-lookups']);
router.use(auth.authenticate);

router.route('/').get(formulaController.getAllFormulas).post(auth.authorize(['admin', 'manager']), clearItemRegistrationLookupsCache, formulaController.createFormula);
router.route('/:id').get(formulaController.getFormulaById).put(auth.authorize(['admin', 'manager']), clearItemRegistrationLookupsCache, formulaController.updateFormula).delete(auth.authorize(['admin']), clearItemRegistrationLookupsCache, formulaController.deleteFormula);
router.patch('/:id/status', auth.authorize(['admin', 'manager']), clearItemRegistrationLookupsCache, formulaController.toggleFormulaStatus);

module.exports = router;
