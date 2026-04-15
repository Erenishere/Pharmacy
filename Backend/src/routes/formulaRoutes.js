const express = require('express');
const formulaController = require('../controllers/formulaController');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth.authenticate);

router.route('/').get(formulaController.getAllFormulas).post(auth.authorize(['admin', 'manager']), formulaController.createFormula);
router.route('/:id').get(formulaController.getFormulaById).put(auth.authorize(['admin', 'manager']), formulaController.updateFormula).delete(auth.authorize(['admin']), formulaController.deleteFormula);
router.patch('/:id/status', auth.authorize(['admin', 'manager']), formulaController.toggleFormulaStatus);

module.exports = router;
