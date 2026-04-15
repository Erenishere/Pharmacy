require('dotenv').config();
const mongoose = require('mongoose');

async function rebuildIndexes() {
  try {
    console.log('🔧 Rebuilding database indexes...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
    });
    console.log('✓ Connected to MongoDB');

    // Import models to register schemas
    const Item = require('./src/models/Item');
    const Batch = require('./src/models/Batch');
    const Customer = require('./src/models/Customer');

    console.log('\n📊 Rebuilding Item indexes...');
    await Item.collection.dropIndexes();
    await Item.syncIndexes();
    console.log('✓ Item indexes rebuilt');

    console.log('\n📦 Rebuilding Batch indexes...');
    await Batch.collection.dropIndexes();
    await Batch.syncIndexes();
    console.log('✓ Batch indexes rebuilt');

    console.log('\n👤 Rebuilding Customer indexes...');
    await Customer.collection.dropIndexes();
    await Customer.syncIndexes();
    console.log('✓ Customer indexes rebuilt');

    console.log('\n✅ All indexes rebuilt successfully!');
    console.log('\n📝 Note: The new indexes will improve POS search performance significantly.');

    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Index rebuild failed:', error);
    process.exit(1);
  }
}

rebuildIndexes();
