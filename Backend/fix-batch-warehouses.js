/**
 * Fix Batch Warehouses
 * Assigns all batches to WH0001 (Main Warehouse - Karachi)
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Batch = require('./src/models/Batch');
const Warehouse = require('./src/models/Warehouse');

async function fixBatchWarehouses() {
  try {
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected\n');

    // Get warehouse WH0001
    const warehouse = await Warehouse.findOne({ code: 'WH0001' });
    if (!warehouse) {
      console.log('❌ Warehouse WH0001 not found');
      return;
    }

    console.log(`📦 Target Warehouse: ${warehouse.code} - ${warehouse.name}`);
    console.log(`   ID: ${warehouse._id}\n`);

    // Check current batch warehouse IDs
    const sampleBatches = await Batch.find().limit(5);
    console.log('📋 Sample batch warehouse values:');
    sampleBatches.forEach(batch => {
      console.log(`  Batch ${batch.batchNumber}: warehouse = ${batch.warehouse}`);
    });
    console.log('');

    // Count batches without valid warehouse
    const batchesWithoutWarehouse = await Batch.countDocuments({
      $or: [
        { warehouse: null },
        { warehouse: { $exists: false } }
      ]
    });
    console.log(`📊 Batches without warehouse: ${batchesWithoutWarehouse}`);

    // Count batches with invalid warehouse (not matching any existing warehouse)
    const allWarehouses = await Warehouse.find();
    const warehouseIds = allWarehouses.map(wh => wh._id.toString());
    
    const allBatches = await Batch.find();
    let invalidWarehouseCount = 0;
    for (const batch of allBatches) {
      if (batch.warehouse && !warehouseIds.includes(batch.warehouse.toString())) {
        invalidWarehouseCount++;
      }
    }
    console.log(`📊 Batches with invalid warehouse: ${invalidWarehouseCount}`);

    // Update all batches to use WH0001
    console.log(`\n🔄 Updating all batches to warehouse ${warehouse.code}...`);
    const result = await Batch.updateMany(
      {},
      { $set: { warehouse: warehouse._id } }
    );

    console.log(`✅ Updated ${result.modifiedCount} batches`);

    // Verify
    const batchesInWarehouse = await Batch.countDocuments({
      warehouse: warehouse._id,
      remainingQuantity: { $gt: 0 }
    });
    console.log(`✅ Batches with stock in ${warehouse.code}: ${batchesInWarehouse}`);

    console.log('\n📡 Database connection closed');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixBatchWarehouses();
