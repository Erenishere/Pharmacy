/**
 * Check Batch Status
 * Verifies batch status and expiry dates
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Batch = require('./src/models/Batch');
const Warehouse = require('./src/models/Warehouse');

async function checkBatchStatus() {
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

    console.log(`📦 Warehouse: ${warehouse.code} - ${warehouse.name}\n`);

    // Count batches by status
    const statusCounts = await Batch.aggregate([
      {
        $match: { warehouse: warehouse._id }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQty: { $sum: '$remainingQuantity' }
        }
      }
    ]);

    console.log('📊 Batches by status:');
    statusCounts.forEach(stat => {
      console.log(`  ${stat._id || 'undefined'}: ${stat.count} batches, ${stat.totalQty} qty`);
    });

    // Count expired vs non-expired
    const now = new Date();
    const expiredCount = await Batch.countDocuments({
      warehouse: warehouse._id,
      expiryDate: { $lt: now }
    });
    const nonExpiredCount = await Batch.countDocuments({
      warehouse: warehouse._id,
      expiryDate: { $gte: now }
    });

    console.log(`\n📅 Expiry status:`);
    console.log(`  Expired: ${expiredCount}`);
    console.log(`  Not expired: ${nonExpiredCount}`);

    // Sample batches
    const sampleBatches = await Batch.find({ warehouse: warehouse._id }).limit(5);
    console.log(`\n📋 Sample batches:`);
    sampleBatches.forEach(batch => {
      console.log(`  ${batch.batchNumber}:`);
      console.log(`    Status: ${batch.status || 'undefined'}`);
      console.log(`    Expiry: ${batch.expiryDate}`);
      console.log(`    Remaining Qty: ${batch.remainingQuantity}`);
      console.log(`    Expired: ${batch.expiryDate < now ? 'YES' : 'NO'}`);
    });

    // Count batches matching POS query
    const posQueryCount = await Batch.countDocuments({
      warehouse: warehouse._id,
      remainingQuantity: { $gt: 0 },
      expiryDate: { $gt: now },
      status: 'active'
    });

    console.log(`\n✅ Batches matching POS query (active, not expired, qty > 0): ${posQueryCount}`);

    console.log('\n📡 Database connection closed');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkBatchStatus();
