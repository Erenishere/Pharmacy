const express = require('express');
const formulaSizeController = require('../controllers/formulaSizeController');
const auth = require('../middleware/auth');
const { cacheMiddleware, clearCacheMiddleware } = require('../middleware/cacheMiddleware');

const router = express.Router();
const formulaSizesByFormulaCache = cacheMiddleware({
  duration: 'long',
  keyGenerator: (req) => `formula-sizes:formula:${req.params.formulaId}`,
});
const clearFormulaSizeLookupCache = clearCacheMiddleware(['formula-sizes:formula:']);
router.use(auth.authenticate);

router.route('/').get(formulaSizeController.getAllFormulaSizes).post(auth.authorize(['admin', 'manager']), clearFormulaSizeLookupCache, formulaSizeController.createFormulaSize);
router.get('/formula/:formulaId', formulaSizesByFormulaCache, formulaSizeController.getFormulaSizesByFormula);
router.route('/:id').get(formulaSizeController.getFormulaSizeById).put(auth.authorize(['admin', 'manager']), clearFormulaSizeLookupCache, formulaSizeController.updateFormulaSize).delete(auth.authorize(['admin']), clearFormulaSizeLookupCache, formulaSizeController.deleteFormulaSize);
router.patch('/:id/status', auth.authorize(['admin', 'manager']), clearFormulaSizeLookupCache, formulaSizeController.toggleFormulaSizeStatus);

module.exports = router;
