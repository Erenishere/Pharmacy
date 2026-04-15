const mongoose = require('mongoose');

const accountHeadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Account head name is required'],
        trim: true,
        unique: true,
    },
    code: {
        type: String,
        required: [true, 'Account head code is required'],
        trim: true,
        unique: true,
        uppercase: true,
    },
    type: {
        type: String,
        required: [true, 'Account head type is required'],
        enum: ['Opening Balance', 'Purchase', 'Sales', 'Expenses', 'Cash', 'Tax', 'Investor', 'Capital'],
        default: 'Expenses',
    },
    parentHeadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AccountHead',
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, {
    timestamps: true,
});

accountHeadSchema.index({ code: 1 });
accountHeadSchema.index({ name: 1 });
accountHeadSchema.index({ type: 1 });

const AccountHead = mongoose.models.AccountHead || mongoose.model('AccountHead', accountHeadSchema);

module.exports = AccountHead;
