const express = require('express');
const router = express.Router();
const CustomerType = require('../models/customertype');
const Response = require('../utils/response');

// Get all customer types
router.get('/', async (req, res) => {
    try {
        const types = await CustomerType.find().sort({ name: 1 });
        return Response.success(res, types, 'Customer types retrieved successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
});

// Create new customer type
router.post('/', async (req, res) => {
    try {
        const type = new CustomerType(req.body);
        await type.save();
        return Response.success(res, type, 'Customer type created successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
});

// Update customer type
router.put('/:id', async (req, res) => {
    try {
        const type = await CustomerType.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!type) return Response.error(res, 'Customer type not found', 404);
        return Response.success(res, type, 'Customer type updated successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
});

// Delete customer type (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const type = await CustomerType.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!type) return Response.error(res, 'Customer type not found', 404);
        return Response.success(res, null, 'Customer type deactivated successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
});

module.exports = router;
