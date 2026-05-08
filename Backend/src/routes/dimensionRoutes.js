const express = require('express');

const router = express.Router();
const { body, param, query } = require('express-validator');
const auth = require('../middleware/auth');
const { clearCacheMiddleware } = require('../middleware/cacheMiddleware');
const { validate } = require('../middleware/validation');
const dimensionController = require('../controllers/dimensionController');
const clearAccountRegistrationLookupsCache = clearCacheMiddleware(['accounts:registration-lookups']);

// Validation rules
const createDimensionValidation = [
  body('code')
    .optional()
    .trim()
    .toUpperCase()
    .isLength({ max: 20 })
    .withMessage('Dimension code cannot exceed 20 characters'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Dimension name is required')
    .isLength({ max: 100 })
    .withMessage('Dimension name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('type')
    .optional()
    .isIn(['BRANCH', 'REGION', 'TERRITORY', 'COST_CENTER', 'DEPARTMENT'])
    .withMessage('Invalid dimension type'),
  body('parentDimensionId')
    .optional()
    .custom((value) => {
      if (value && value !== 'null' && !value.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error('Invalid parent dimension ID');
      }
      return true;
    }),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  validate,
];

const updateDimensionValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid dimension ID'),
  body('code')
    .optional()
    .trim()
    .toUpperCase()
    .isLength({ max: 20 })
    .withMessage('Dimension code cannot exceed 20 characters'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Dimension name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Dimension name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('type')
    .optional()
    .isIn(['BRANCH', 'REGION', 'TERRITORY', 'COST_CENTER', 'DEPARTMENT'])
    .withMessage('Invalid dimension type'),
  body('parentDimensionId')
    .optional()
    .custom((value) => {
      if (value && value !== 'null' && !value.match(/^[0-9a-fA-F]{24}$/)) {
        throw new Error('Invalid parent dimension ID');
      }
      return true;
    }),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  validate,
];

// Protect all routes
router.use(auth.authenticate);

// Routes
router.get('/', dimensionController.getAllDimensions);
router.get('/types', dimensionController.getDimensionTypes);
router.get('/roots', dimensionController.getRootDimensions);
router.get('/:id', [param('id').isMongoId().withMessage('Invalid dimension ID'), validate], dimensionController.getDimensionById);
router.post('/', auth.authorize(['admin', 'manager']), createDimensionValidation, clearAccountRegistrationLookupsCache, dimensionController.createDimension);
router.put('/:id', auth.authorize(['admin', 'manager']), updateDimensionValidation, clearAccountRegistrationLookupsCache, dimensionController.updateDimension);
router.delete('/:id', auth.authorize(['admin']), [param('id').isMongoId().withMessage('Invalid dimension ID'), validate], clearAccountRegistrationLookupsCache, dimensionController.deleteDimension);

module.exports = router;
