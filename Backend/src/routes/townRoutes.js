const express = require('express');
const townController = require('../controllers/townController');
const auth = require('../middleware/auth');
const { clearCacheMiddleware } = require('../middleware/cacheMiddleware');

const router = express.Router();
const clearAccountRegistrationLookupsCache = clearCacheMiddleware(['accounts:registration-lookups']);

// Protect all routes
router.use(auth.authenticate);

// Town routes
router
  .route('/')
  .get(townController.getAllTowns)
  .post(auth.authorize(['admin', 'manager']), clearAccountRegistrationLookupsCache, townController.createTown);

router
  .route('/:id')
  .get(townController.getTownById)
  .put(auth.authorize(['admin', 'manager']), clearAccountRegistrationLookupsCache, townController.updateTown)
  .delete(auth.authorize(['admin']), clearAccountRegistrationLookupsCache, townController.deleteTown);

router.patch('/:id/status', auth.authorize(['admin', 'manager']), clearAccountRegistrationLookupsCache, townController.toggleTownStatus);

module.exports = router;
