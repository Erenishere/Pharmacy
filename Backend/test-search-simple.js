require('dotenv').config();
const mongoose = require('mongoose');
const posItemService = require('./src/services/posItemService');
const Warehouse = require('./src/models/Warehouse');

async function testSearch() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected\n');

    const warehouse = await Warehouse.findOne({ isActive: true });
    console.log(`Using warehouse: ${warehouse.name}\n`);

    console.log('Testing search for "para"...');
    const results = await posItemService.searchItems('para', warehouse._id.toString(), 20);
    
    console.log(`\nFound ${results.length} items:`);
    results.forEach(item => {
      console.log(`  - ${item.name}: ${item.availableStock} units @ PKR ${item.price}`);
    });

    console.log('\n\nTesting search for "Paracetamol"...');
    const results2 = await posItemService.searchItems('Paracetamol', warehouse._id.toString(), 20);
    
    console.log(`\nFound ${results2.length} items:`);
    results2.forEach(item => {
      console.log(`  - ${item.name}: ${item.availableStock} units @ PKR ${item.price}`);
    });

    await mongoose.connection.close();
    console.log('\n✓ Test completed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testSearch();
