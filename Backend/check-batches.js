const mongoose = require('mongoose');
require('dotenv').config();

const Batch = require('./src/models/Batch');

async function checkBatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy');
    console.log('Connected to MongoDB');

    const warehouseId = '698ed3d3b0be298a6cd87360'; // Main Warehouse
    const batchCount = await Batch.countDocuments({
      warehouse: new mongoose.Types.ObjectId(warehouseId),
      status: 'active',
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() }
    });

    console.log('Total Active Batches in Main Warehouse:', batchCount);

    if (batchCount > 0) {
      const sample = await Batch.findOne({
        warehouse: new mongoose.Types.ObjectId(warehouseId),
        status: 'active',
        quantity: { $gt: 0 },
        expiryDate: { $gt: new Date() }
      }).populate('item', 'name code');
      console.log('Sample Batch:', JSON.stringify(sample, null, 2));
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkBatches();
