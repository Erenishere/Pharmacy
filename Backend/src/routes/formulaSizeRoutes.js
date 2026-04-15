const express = require('express');
const formulaSizeController = require('../controllers/formulaSizeController');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth.authenticate);

router.route('/').get(formulaSizeController.getAllFormulaSizes).post(auth.authorize(['admin', 'manager']), formulaSizeController.createFormulaSize);
router.get('/formula/:formulaId', formulaSizeController.getFormulaSizesByFormula);
router.route('/:id').get(formulaSizeController.getFormulaSizeById).put(auth.authorize(['admin', 'manager']), formulaSizeController.updateFormulaSize).delete(auth.authorize(['admin']), formulaSizeController.deleteFormulaSize);
router.patch('/:id/status', auth.authorize(['admin', 'manager']), formulaSizeController.toggleFormulaSizeStatus);

module.exports = router;
