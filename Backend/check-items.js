/**
 * Check Items
 * Verifies items in the database
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Item = require('./src/models/Item');
const Batch = require('./src/models/Batch');
const Warehouse = require('./src/models/Warehouse');

async function checkItems() {
  try {
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected\n');

    // Get warehouse WH0001
    const warehouse = await Warehouse.findOne({ code: 'WH0001' });
    console.log(`📦 Warehouse: ${warehouse.code} - ${warehouse.name}\n`);

    // Count total items
    const totalItems = await Item.countDocuments({ isActive: true });
    console.log(`📊 Total active items: ${totalItems}`);

    // Sample items
    const sampleItems = await Item.find({ isActive: true }).limit(10);
    console.log(`\n📋 Sample items:`);
    sampleItems.forEach(item => {
      console.log(`  ${item.code} | ${item.name}`);
    });

    // Search for items with 'a'
    const itemsWithA = await Item.find({
      isActive: true,
      $or: [
        { name: { $regex: 'a', $options: 'i' } },
        { code: { $regex: 'a', $options: 'i' } },
        { barcode: { $regex: 'a', $options: 'i' } },
        { sku: { $regex: 'a', $options: 'i' } }
      ]
    }).limit(10);

    console.log(`\n🔍 Items matching 'a': ${itemsWithA.length}`);
    itemsWithA.forEach(item => {
      console.log(`  ${item.code} | ${item.name}`);
    });

    // Check which items have stock in warehouse
    console.log(`\n📦 Checking stock for items with 'a'...`);
    for (const item of itemsWithA.slice(0, 5)) {
      const stockCount = await Batch.countDocuments({
        item: item._id,
        warehouse: warehouse._id,
        remainingQuantity: { $gt: 0 },
        expiryDate: { $gt: new Date() },
        status: 'active'
      });
      
      const totalStock = await Batch.aggregate([
        {
          $match: {
            item: item._id,
            warehouse: warehouse._id,
            remainingQuantity: { $gt: 0 },
            expiryDate: { $gt: new Date() },
            status: 'active'
          }
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$remainingQuantity' }
          }
        }
      ]);

      const qty = totalStock.length > 0 ? totalStock[0].totalQuantity : 0;
      console.log(`  ${item.code}: ${stockCount} batches, ${qty} qty`);
    }

    console.log('\n📡 Database connection closed');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkItems();
