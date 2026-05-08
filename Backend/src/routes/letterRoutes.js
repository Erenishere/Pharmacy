const express = require('express');
const router = express.Router();
const letterController = require('../controllers/letterController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/', authenticate, authorize(['admin', 'manager', 'accountant']), letterController.createLetter);
router.get('/', authenticate, authorize(['admin', 'manager', 'accountant']), letterController.getLetters);
router.get('/:id', authenticate, authorize(['admin', 'manager', 'accountant']), letterController.getLetterById);
router.put('/:id', authenticate, authorize(['admin', 'manager', 'accountant']), letterController.updateLetter);
router.delete('/:id', authenticate, authorize(['admin', 'manager']), letterController.deleteLetter);

module.exports = router;
