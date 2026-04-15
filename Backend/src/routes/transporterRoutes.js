const express = require('express');
const transporterController = require('../controllers/transporterController');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth.authenticate);

router.route('/').get(transporterController.getAllTransporters).post(auth.authorize(['admin', 'manager']), transporterController.createTransporter);
router.route('/:id').get(transporterController.getTransporterById).put(auth.authorize(['admin', 'manager']), transporterController.updateTransporter).delete(auth.authorize(['admin']), transporterController.deleteTransporter);
router.patch('/:id/status', auth.authorize(['admin', 'manager']), transporterController.toggleTransporterStatus);

module.exports = router;
