const express = require('express');
const router = express.Router();
const companyGroupController = require('../controllers/companyGroupController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', companyGroupController.getAll);
router.get('/company/:companyId', companyGroupController.getByCompany);
router.get('/:id', companyGroupController.getById);
router.post('/', companyGroupController.create);
router.put('/:id', companyGroupController.update);
router.delete('/:id', companyGroupController.delete);

module.exports = router;
