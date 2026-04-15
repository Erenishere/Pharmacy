const mongoose = require('mongoose');

const dayPlanSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
  areaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Area',
    required: true,
  },
}, { _id: true });

const routePlanSchema = new mongoose.Schema({
  monthYear: {
    type: String,
    required: [true, 'Month/Year is required'],
    match: [/^\d{4}-\d{2}$/, 'Month/Year must be in YYYY-MM format'],
  },
  salesmanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Salesman is required'],
  },
  dimensionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dimension',
  },
  salesTarget: {
    type: Number,
    default: 0,
    min: 0,
  },
  recoveryTarget: {
    type: Number,
    default: 0,
    min: 0,
  },
  visitTarget: {
    type: Number,
    default: 0,
    min: 0,
  },
  days: [dayPlanSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
  },
}, {
  timestamps: true,
});

routePlanSchema.index({ monthYear: 1, salesmanId: 1 }, { unique: true });
routePlanSchema.index({ salesmanId: 1 });
routePlanSchema.index({ dimensionId: 1 });

module.exports = mongoose.model('RoutePlan', routePlanSchema);
