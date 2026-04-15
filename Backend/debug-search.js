require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./src/models/Item');
const Batch = require('./src/models/Batch');
const Warehouse = require('./src/models/Warehouse');

async function debugSearch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected\n');

    const warehouse = await Warehouse.findOne({ isActive: true });
    console.log(`Warehouse: ${warehouse.name} (${warehouse._id})\n`);

    const query = 'para';
    
    // Step 1: Find items
    console.log(`Step 1: Finding items matching "${query}"...`);
    const searchQuery = {
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { code: { $regex: query, $options: 'i' } },
        { barcode: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } }
      ]
    };

    const items = await Item.find(searchQuery)
      .select('_id name code barcode sku pricing.salePrice unit tax.gstRate')
      .limit(20)
      .lean()
      .exec();

    console.log(`Found ${items.length} items`);
    items.forEach(item => {
      console.log(`  - ${item.name} (${item._id})`);
    });

    if (items.length === 0) {
      console.log('\n❌ No items found - search stopped');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Step 2: Get item IDs
    const itemIds = items.map(item => item._id);
    console.log(`\nStep 2: Looking for batches for ${itemIds.length} items...`);
    console.log(`Warehouse ID: ${warehouse._id}`);
    console.log(`Warehouse ID type: ${typeof warehouse._id}`);

    // Step 3: Check batches directly
    console.log('\nStep 3: Checking batches directly...');
    const directBatches = await Batch.find({
      item: { $in: itemIds },
      warehouse: warehouse._id
    }).select('batchNumber item warehouse quantity expiryDate isActive');

    console.log(`Found ${directBatches.length} batches (any status)`);
    directBatches.forEach(b => {
      console.log(`  - ${b.batchNumber}: ${b.quantity} units, active: ${b.isActive}, expires: ${b.expiryDate.toISOString().split('T')[0]}`);
    });

    // Step 4: Check with filters
    console.log('\nStep 4: Checking with filters (active, stock > 0, not expired)...');
    const filteredBatches = await Batch.find({
      item: { $in: itemIds },
      warehouse: warehouse._id,
      isActive: true,
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() }
    }).select('batchNumber item warehouse quantity expiryDate');

    console.log(`Found ${filteredBatches.length} filtered batches`);
    filteredBatches.forEach(b => {
      console.log(`  - ${b.batchNumber}: ${b.quantity} units`);
    });

    // Step 5: Try aggregation
    console.log('\nStep 5: Testing aggregation...');
    try {
      const batchStocks = await Batch.aggregate([
        {
          $match: {
            item: { $in: itemIds },
            warehouse: new mongoose.Types.ObjectId(warehouse._id),
            isActive: true,
            quantity: { $gt: 0 },
            expiryDate: { $gt: new Date() }
          }
        },
        {
          $group: {
            _id: '$item',
            totalStock: { $sum: '$quantity' }
          }
        }
      ]);

      console.log(`Aggregation found ${batchStocks.length} items with stock`);
      batchStocks.forEach(stock => {
        const item = items.find(i => i._id.toString() === stock._id.toString());
        console.log(`  - ${item?.name || 'Unknown'}: ${stock.totalStock} units`);
      });
    } catch (error) {
      console.error('Aggregation error:', error.message);
    }

    await mongoose.connection.close();
    console.log('\n✓ Debug completed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

debugSearch();
