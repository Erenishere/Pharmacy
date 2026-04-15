const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/pharmacy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function assignWarehouseToSalesman() {
  try {
    // Import models
    const Salesman = require('./src/models/Salesman');
    const Warehouse = require('./src/models/Warehouse');

    // Find your salesman
    const salesman = await Salesman.findById('69932a1f914eae8571c5b1e2');
    if (!salesman) {
      console.log('Salesman not found');
      return;
    }

    console.log('Found salesman:', salesman.code, salesman.name);
    console.log('Current warehouseId:', salesman.warehouseId);

    // Find available warehouses
    const warehouses = await Warehouse.find({ isActive: true });
    console.log('Available warehouses:');
    warehouses.forEach(w => {
      console.log(`- ${w._id}: ${w.name} (${w.code})`);
    });

    if (warehouses.length > 0) {
      // Assign first warehouse to salesman
      const warehouseId = warehouses[0]._id;
      salesman.warehouseId = warehouseId;
      await salesman.save();
      
      console.log('✅ Successfully assigned warehouse:', warehouseId);
      console.log('Salesman now has warehouse:', salesman.warehouseId);
    } else {
      console.log('❌ No active warehouses found. Please create a warehouse first.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

assignWarehouseToSalesman();