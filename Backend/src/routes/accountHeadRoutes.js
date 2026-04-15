const express = require('express');
const accountHeadController = require('../controllers/accountHeadController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.route('/')
    .get(accountHeadController.getAllAccountHeads)
    .post(authorize(['admin', 'manager']), accountHeadController.createAccountHead);

router.route('/:id')
    .get(accountHeadController.getAccountHeadById)
    .put(authorize(['admin', 'manager']), accountHeadController.updateAccountHead)
    .delete(authorize(['admin']), accountHeadController.deleteAccountHead);

module.exports = router;
