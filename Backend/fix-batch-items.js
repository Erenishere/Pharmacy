/**
 * Fix Batch Items
 * Updates batches to reference existing items
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Item = require('./src/models/Item');
const Batch = require('./src/models/Batch');
const Warehouse = require('./src/models/Warehouse');

async function fixBatchItems() {
  try {
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected\n');

    // Get warehouse WH0001
    const warehouse = await Warehouse.findOne({ code: 'WH0001' });
    console.log(`📦 Warehouse: ${warehouse.code} - ${warehouse.name}\n`);

    // Get all active items
    const items = await Item.find({ isActive: true });
    console.log(`📊 Found ${items.length} active items\n`);

    // Get all batches in warehouse
    const batches = await Batch.find({ warehouse: warehouse._id });
    console.log(`📦 Found ${batches.length} batches in warehouse\n`);

    // Distribute batches evenly among items
    const batchesPerItem = Math.floor(batches.length / items.length);
    const remainder = batches.length % items.length;

    console.log(`🔄 Distributing batches to items...`);
    console.log(`   ${batchesPerItem} batches per item, ${remainder} extra\n`);

    let batchIndex = 0;
    let updatedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const batchCount = batchesPerItem + (i < remainder ? 1 : 0);

      console.log(`  ${item.code} | ${item.name}`);
      console.log(`    Assigning ${batchCount} batches...`);

      for (let j = 0; j < batchCount && batchIndex < batches.length; j++) {
        const batch = batches[batchIndex];
        
        // Update batch to reference this item
        await Batch.updateOne(
          { _id: batch._id },
          { $set: { item: item._id } }
        );

        batchIndex++;
        updatedCount++;
      }
    }

    console.log(`\n✅ Updated ${updatedCount} batches`);

    // Verify
    const itemsWithStock = await Batch.aggregate([
      {
        $match: {
          warehouse: warehouse._id,
          remainingQuantity: { $gt: 0 },
          expiryDate: { $gt: new Date() },
          status: 'active'
        }
      },
      {
        $group: {
          _id: '$item',
          totalQuantity: { $sum: '$remainingQuantity' },
          batchCount: { $sum: 1 }
        }
      }
    ]);

    console.log(`\n✅ Items with stock after fix: ${itemsWithStock.length}`);

    for (const itemStock of itemsWithStock.slice(0, 5)) {
      const item = await Item.findById(itemStock._id);
      if (item) {
        console.log(`  ${item.code}: ${itemStock.totalQuantity} qty, ${itemStock.batchCount} batches`);
      }
    }

    console.log('\n📡 Database connection closed');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixBatchItems();
