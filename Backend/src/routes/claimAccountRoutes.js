const express = require('express');
const claimAccountController = require('../controllers/claimAccountController');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth.authenticate);

router.route('/').get(claimAccountController.getAllClaimAccounts).post(auth.authorize(['admin', 'manager']), claimAccountController.createClaimAccount);
router.route('/:id').get(claimAccountController.getClaimAccountById).put(auth.authorize(['admin', 'manager']), claimAccountController.updateClaimAccount).delete(auth.authorize(['admin']), claimAccountController.deleteClaimAccount);
router.patch('/:id/status', auth.authorize(['admin', 'manager']), claimAccountController.toggleClaimAccountStatus);

module.exports = router;
