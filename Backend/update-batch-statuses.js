/**
 * Update Batch Statuses
 * Runs the batch status update method to fix expired batches
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Batch = require('./src/models/Batch');

async function updateBatchStatuses() {
  try {
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected\n');

    console.log('🔄 Updating batch statuses...');
    const result = await Batch.updateBatchStatuses();

    console.log(`✅ Updated statuses:`);
    console.log(`   Expired: ${result.expired} batches`);
    console.log(`   Activated: ${result.activated} batches`);

    console.log('\n📡 Database connection closed');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateBatchStatuses();
