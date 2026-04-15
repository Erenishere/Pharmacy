const express = require('express');
const areaController = require('../controllers/areaController');
const auth = require('../middleware/auth');

const router = express.Router();

// Protect all routes
router.use(auth.authenticate);

// Area routes
router
  .route('/')
  .get(areaController.getAllAreas)
  .post(auth.authorize(['admin', 'manager']), areaController.createArea);

// Get areas by town - must be before /:id route
router.get('/town/:townId', areaController.getAreasByTown);

router
  .route('/:id')
  .get(areaController.getAreaById)
  .put(auth.authorize(['admin', 'manager']), areaController.updateArea)
  .delete(auth.authorize(['admin']), areaController.deleteArea);

router.patch('/:id/status', auth.authorize(['admin', 'manager']), areaController.toggleAreaStatus);

module.exports = router;
