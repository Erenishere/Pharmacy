/**
 * Check Warehouse Stock
 * Verifies items and batches in the warehouse
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Item = require('./src/models/Item');
const Batch = require('./src/models/Batch');
const Warehouse = require('./src/models/Warehouse');

async function checkWarehouseStock() {
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

    console.log(`📦 Warehouse: ${warehouse.code} - ${warehouse.name}`);
    console.log(`   ID: ${warehouse._id}\n`);

    // Count total items
    const totalItems = await Item.countDocuments({ isActive: true });
    console.log(`📊 Total active items: ${totalItems}`);

    // Count batches in this warehouse
    const totalBatches = await Batch.countDocuments({
      warehouseId: warehouse._id,
      quantity: { $gt: 0 }
    });
    console.log(`📦 Total batches with stock in warehouse: ${totalBatches}\n`);

    // Get sample items with stock
    const itemsWithStock = await Batch.aggregate([
      {
        $match: {
          warehouseId: warehouse._id,
          quantity: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$itemId',
          totalQuantity: { $sum: '$quantity' },
          batchCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: '_id',
          as: 'item'
        }
      },
      {
        $unwind: '$item'
      },
      {
        $limit: 10
      }
    ]);

    if (itemsWithStock.length > 0) {
      console.log('📋 Sample items with stock:');
      console.log('─'.repeat(80));
      itemsWithStock.forEach(item => {
        console.log(`  ✅ ${item.item.code} | ${item.item.name}`);
        console.log(`     Total Qty: ${item.totalQuantity} | Batches: ${item.batchCount}`);
      });
    } else {
      console.log('⚠️  No items with stock found in warehouse');
      
      // Check if there are any batches at all
      const anyBatches = await Batch.countDocuments();
      console.log(`\n📊 Total batches in database: ${anyBatches}`);
      
      if (anyBatches > 0) {
        // Show sample batches
        const sampleBatches = await Batch.find().limit(5);
        console.log('\n📋 Sample batches:');
        for (const batch of sampleBatches) {
          const item = await Item.findById(batch.itemId);
          const wh = await Warehouse.findById(batch.warehouseId);
          console.log(`  Batch: ${batch.batchNumber}`);
          console.log(`  Item: ${item?.name || 'Unknown'}`);
          console.log(`  Warehouse: ${wh?.code || 'Unknown'}`);
          console.log(`  Quantity: ${batch.quantity}`);
          console.log('');
        }
        
        // Check which warehouses have stock
        const warehousesWithStock = await Batch.aggregate([
          {
            $match: { quantity: { $gt: 0 } }
          },
          {
            $group: {
              _id: '$warehouseId',
              totalBatches: { $sum: 1 },
              totalQuantity: { $sum: '$quantity' }
            }
          }
        ]);
        
        console.log('\n📊 Warehouses with stock:');
        for (const wh of warehousesWithStock) {
          const warehouse = await Warehouse.findById(wh._id);
          console.log(`  ${warehouse?.code || 'Unknown'}: ${wh.totalBatches} batches, ${wh.totalQuantity} total qty`);
        }
      }
    }

    console.log('\n📡 Database connection closed');
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkWarehouseStock();
