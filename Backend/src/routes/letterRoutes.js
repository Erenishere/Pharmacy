const express = require('express');
const router = express.Router();
const letterController = require('../controllers/letterController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.post('/', authenticate, authorize(['admin', 'manager', 'accountant']), letterController.createLetter);
router.get('/', authenticate, authorize(['admin', 'manager', 'accountant']), letterController.getLetters);
router.get('/:id', authenticate, authorize(['admin', 'manager', 'accountant']), letterController.getLetterById);
router.put('/:id', authenticate, authorize(['admin', 'manager', 'accountant']), letterController.updateLetter);
router.delete('/:id', authenticate, authorize(['admin', 'manager']), letterController.deleteLetter);

module.exports = router;
