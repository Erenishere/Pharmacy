const mongoose = require('mongoose');

const companyGroupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Group name is required'],
            trim: true,
            maxlength: [100, 'Group name cannot exceed 100 characters'],
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
            required: [true, 'Company reference is required'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
        updatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// Compound index for unique group name within a company
companyGroupSchema.index({ name: 1, companyId: 1 }, { unique: true });
companyGroupSchema.index({ companyId: 1 });
companyGroupSchema.index({ isActive: 1 });

// Pre-save middleware
companyGroupSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const CompanyGroup = mongoose.models.CompanyGroup || mongoose.model('CompanyGroup', companyGroupSchema);

module.exports = CompanyGroup;
