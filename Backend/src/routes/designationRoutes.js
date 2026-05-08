const express = require('express');
const router = express.Router();
const Designation = require('../models/designation');
const Response = require('../utils/response');
const { clearCacheMiddleware } = require('../middleware/cacheMiddleware');

const clearAccountRegistrationLookupsCache = clearCacheMiddleware(['accounts:registration-lookups']);

// Get all designations
router.get('/', async (req, res) => {
    try {
        const designations = await Designation.find().sort({ name: 1 });
        return Response.success(res, designations, 'Designations retrieved successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
});

// Create new designation
router.post('/', clearAccountRegistrationLookupsCache, async (req, res) => {
    try {
        const designation = new Designation(req.body);
        await designation.save();
        return Response.success(res, designation, 'Designation created successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
});

// Update designation
router.put('/:id', clearAccountRegistrationLookupsCache, async (req, res) => {
    try {
        const designation = await Designation.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!designation) return Response.error(res, 'Designation not found', 404);
        return Response.success(res, designation, 'Designation updated successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
});

// Delete designation (soft delete)
router.delete('/:id', clearAccountRegistrationLookupsCache, async (req, res) => {
    try {
        const designation = await Designation.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!designation) return Response.error(res, 'Designation not found', 404);
        return Response.success(res, null, 'Designation deactivated successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
});

module.exports = router;
