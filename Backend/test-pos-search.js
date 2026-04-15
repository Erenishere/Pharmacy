require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./src/models/Item');
const Batch = require('./src/models/Batch');
const Warehouse = require('./src/models/Warehouse');

async function testPOSSearch() {
  try {
    console.log('🔍 Testing POS Search...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get a warehouse
    const warehouse = await Warehouse.findOne({ isActive: true });
    if (!warehouse) {
      console.log('❌ No warehouse found');
      process.exit(1);
    }
    console.log(`✓ Using warehouse: ${warehouse.name} (${warehouse._id})\n`);

    // Check total items
    const totalItems = await Item.countDocuments({ isActive: true });
    console.log(`📦 Total active items in database: ${totalItems}\n`);

    // List all items
    console.log('📋 All active items:');
    const allItems = await Item.find({ isActive: true })
      .select('_id name code barcode')
      .limit(10)
      .lean();
    
    allItems.forEach(item => {
      console.log(`   - ${item.name} (${item.code}) [${item.barcode || 'no barcode'}]`);
    });

    // Check batches
    console.log('\n📦 Checking batches...');
    const totalBatches = await Batch.countDocuments({ 
      warehouse: warehouse._id,
      isActive: true 
    });
    console.log(`   Total batches in warehouse: ${totalBatches}`);

    const batchesWithStock = await Batch.countDocuments({ 
      warehouse: warehouse._id,
      isActive: true,
      quantity: { $gt: 0 }
    });
    console.log(`   Batches with stock > 0: ${batchesWithStock}`);

    const nonExpiredBatches = await Batch.countDocuments({ 
      warehouse: warehouse._id,
      isActive: true,
      quantity: { $gt: 0 },
      expiryDate: { $gt: new Date() }
    });
    console.log(`   Non-expired batches with stock: ${nonExpiredBatches}\n`);

    // Test search with first item name
    if (allItems.length > 0) {
      const testItem = allItems[0];
      const searchQuery = testItem.name.substring(0, 3).toLowerCase();
      
      console.log(`🔍 Testing search with query: "${searchQuery}"`);
      console.log(`   (Should match: ${testItem.name})\n`);

      // Test the search query
      const searchResults = await Item.find({
        isActive: true,
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { code: { $regex: searchQuery, $options: 'i' } },
          { barcode: { $regex: searchQuery, $options: 'i' } }
        ]
      })
      .select('_id name code barcode')
      .limit(20)
      .lean();

      console.log(`   Found ${searchResults.length} items matching search`);
      searchResults.forEach(item => {
        console.log(`   - ${item.name} (${item.code})`);
      });

      // Check stock for these items
      console.log('\n📊 Checking stock for search results...');
      for (const item of searchResults.slice(0, 3)) {
        const batches = await Batch.find({
          item: item._id,
          warehouse: warehouse._id,
          isActive: true,
          quantity: { $gt: 0 },
          expiryDate: { $gt: new Date() }
        }).select('batchNumber quantity expiryDate');

        const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
        console.log(`   ${item.name}: ${totalStock} units (${batches.length} batches)`);
        
        if (batches.length > 0) {
          batches.forEach(b => {
            console.log(`      - Batch ${b.batchNumber}: ${b.quantity} units (expires: ${b.expiryDate.toISOString().split('T')[0]})`);
          });
        }
      }

      // Test aggregation query
      console.log('\n🔄 Testing aggregation query...');
      const itemIds = searchResults.map(i => i._id);
      
      const batchStocks = await Batch.aggregate([
        {
          $match: {
            item: { $in: itemIds },
            warehouse: mongoose.Types.ObjectId(warehouse._id),
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

      console.log(`   Aggregation found stock for ${batchStocks.length} items:`);
      batchStocks.forEach(stock => {
        const item = searchResults.find(i => i._id.toString() === stock._id.toString());
        if (item) {
          console.log(`   - ${item.name}: ${stock.totalStock} units`);
        }
      });
    }

    await mongoose.connection.close();
    console.log('\n✓ Test completed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testPOSSearch();
