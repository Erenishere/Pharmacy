const express = require('express');
const townController = require('../controllers/townController');
const auth = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(auth.authenticate);

// Town routes
router
  .route('/')
  .get(townController.getAllTowns)
  .post(auth.authorize(['admin', 'manager']), townController.createTown);

router
  .route('/:id')
  .get(townController.getTownById)
  .put(auth.authorize(['admin', 'manager']), townController.updateTown)
  .delete(auth.authorize(['admin']), townController.deleteTown);

router.patch('/:id/status', auth.authorize(['admin', 'manager']), townController.toggleTownStatus);

module.exports = router;
