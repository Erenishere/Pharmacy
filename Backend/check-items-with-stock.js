/**
 * Check Items with Stock
 * Find which items actually have stock in WH0001
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Item = require('./src/models/Item');
const Batch = require('./src/models/Batch');
const Warehouse = require('./src/models/Warehouse');

async function checkItemsWithStock() {
  try {
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected\n');

    // Get warehouse WH0001
    const warehouse = await Warehouse.findOne({ code: 'WH0001' });
    console.log(`📦 Warehouse: ${warehouse.code} - ${warehouse.name}\n`);

    // Get items with stock using aggregation
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
      },
      {
        $limit: 20
      }
    ]);

    console.log(`📊 Items with stock: ${itemsWithStock.length}\n`);

    for (const itemStock of itemsWithStock) {
      const item = await Item.findById(itemStock._id);
      if (item) {
        console.log(`  ${item.code} | ${item.name}`);
        console.log(`    Stock: ${itemStock.totalQuantity} | Batches: ${itemStock.batchCount}`);
      } else {
        console.log(`  Item ID: ${itemStock._id} (NOT FOUND IN ITEMS COLLECTION)`);
        console.log(`    Stock: ${itemStock.totalQuantity} | Batches: ${itemStock.batchCount}`);
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

checkItemsWithStock();
