const AccountHead = require('../models/accounthead');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Response = require('../utils/response');

/**
 * Get all account heads
 */
exports.getAllAccountHeads = catchAsync(async (req, res) => {
    const { type, isActive } = req.query;

    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const accountHeads = await AccountHead.find(query).sort({ name: 1 });

    return Response.success(res, accountHeads, 'Account heads retrieved successfully');
});

/**
 * Create new account head
 */
exports.createAccountHead = catchAsync(async (req, res) => {
    const accountHead = await AccountHead.create(req.body);
    return Response.success(res, accountHead, 'Account head created successfully', 201);
});

/**
 * Get account head by ID
 */
exports.getAccountHeadById = catchAsync(async (req, res) => {
    const accountHead = await AccountHead.findById(req.params.id);
    if (!accountHead) {
        throw new AppError('Account head not found', 404);
    }
    return Response.success(res, accountHead, 'Account head retrieved successfully');
});

/**
 * Update account head
 */
exports.updateAccountHead = catchAsync(async (req, res) => {
    const accountHead = await AccountHead.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!accountHead) {
        throw new AppError('Account head not found', 404);
    }
    return Response.success(res, accountHead, 'Account head updated successfully');
});

/**
 * Delete account head
 */
exports.deleteAccountHead = catchAsync(async (req, res) => {
    const accountHead = await AccountHead.findByIdAndDelete(req.params.id);
    if (!accountHead) {
        throw new AppError('Account head not found', 404);
    }
    return Response.success(res, null, 'Account head deleted successfully');
});
