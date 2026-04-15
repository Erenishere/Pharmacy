const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function fixWarehouseAssignment() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy');
    console.log('Connected to MongoDB');

    // Import models
    const Salesman = require('./src/models/Salesman');
    const Warehouse = require('./src/models/Warehouse');

    // Find your salesman
    const salesman = await Salesman.findById('69932a1f914eae8571c5b1e2');
    if (!salesman) {
      console.log('❌ Salesman not found with ID: 69932a1f914eae8571c5b1e2');
      return;
    }

    console.log('Found salesman:', salesman.code, salesman.name);
    console.log('Current warehouseId:', salesman.warehouseId);

    // Find available warehouses
    const warehouses = await Warehouse.find({ isActive: true });
    console.log('Available warehouses:', warehouses.length);
    warehouses.forEach(w => {
      console.log(`- ${w._id}: ${w.name} (${w.code})`);
    });

    if (warehouses.length === 0) {
      console.log('❌ No active warehouses found. Please create a warehouse first.');
      return;
    }

    // Assign first warehouse to salesman
    const warehouseId = warehouses[0]._id;
    salesman.warehouseId = warehouseId;
    await salesman.save();
    
    console.log('✅ Successfully assigned warehouse to salesman!');
    console.log('Salesman:', salesman.code, 'now has warehouse:', warehouseId);

    // Verify the assignment
    const updatedSalesman = await Salesman.findById('69932a1f914eae8571c5b1e2');
    console.log('Verification - Updated warehouseId:', updatedSalesman.warehouseId);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixWarehouseAssignment();