const CompanyGroup = require('../models/companygroup');
const Response = require('../utils/response');

exports.getAll = async (req, res) => {
    try {
        const filters = { isActive: true };
        if (req.query.companyId) filters.companyId = req.query.companyId;
        if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';

        const groups = await CompanyGroup.find(filters).populate('companyId').sort({ name: 1 });
        return Response.success(res, groups, 'Company groups retrieved successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
};

exports.getById = async (req, res) => {
    try {
        const group = await CompanyGroup.findById(req.params.id).populate('companyId');
        if (!group) return Response.error(res, 'Company group not found', 404);
        return Response.success(res, group);
    } catch (error) {
        return Response.error(res, error.message);
    }
};

exports.create = async (req, res) => {
    try {
        const group = new CompanyGroup(req.body);
        await group.save();
        return Response.success(res, group, 'Company group created successfully');
    } catch (error) {
        if (error.code === 11000) return Response.error(res, 'Group name already exists for this company', 400);
        return Response.error(res, error.message);
    }
};

exports.update = async (req, res) => {
    try {
        const group = await CompanyGroup.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!group) return Response.error(res, 'Company group not found', 404);
        return Response.success(res, group, 'Company group updated successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
};

exports.delete = async (req, res) => {
    try {
        const group = await CompanyGroup.findByIdAndDelete(req.params.id);
        if (!group) return Response.error(res, 'Company group not found', 404);
        return Response.success(res, null, 'Company group deleted successfully');
    } catch (error) {
        return Response.error(res, error.message);
    }
};

exports.getByCompany = async (req, res) => {
    try {
        const groups = await CompanyGroup.find({ companyId: req.params.companyId, isActive: true }).sort({ name: 1 });
        return Response.success(res, groups);
    } catch (error) {
        return Response.error(res, error.message);
    }
};
