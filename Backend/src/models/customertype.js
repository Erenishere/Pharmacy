const mongoose = require('mongoose');

const customerTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Customer type name is required'],
        trim: true,
        unique: true,
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true,
});

const CustomerType = mongoose.models.CustomerType || mongoose.model('CustomerType', customerTypeSchema);

module.exports = CustomerType;
