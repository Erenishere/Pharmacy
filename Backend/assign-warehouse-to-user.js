require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Warehouse = require('./src/models/Warehouse');
const database = require('./src/config/database');

async function assignWarehouse() {
    try {
        console.log('Connecting to database...');
        await database.connect();

        // Get or create a default warehouse
        let warehouse = await Warehouse.findOne({ code: 'WH-MAIN' });
        
        if (!warehouse) {
            console.log('Creating default warehouse...');
            warehouse = await Warehouse.create({
                code: 'WH-MAIN',
                name: 'Main Warehouse',
                location: 'Head Office',
                isActive: true,
                capacity: 10000,
                currentStock: 0
            });
            console.log('✅ Default warehouse created:', warehouse.code);
        } else {
            console.log('✅ Found existing warehouse:', warehouse.code);
        }

        // Find the user (try admin_new first, then admin)
        let user = await User.findOne({ username: 'admin_new' });
        
        if (!user) {
            user = await User.findOne({ username: 'admin' });
        }

        if (!user) {
            console.log('❌ No admin user found. Run "node create-admin.js" first.');
            process.exit(1);
        }

        console.log(`\nFound user: ${user.username}`);
        console.log(`Current warehouse: ${user.warehouseId || user.warehouse || 'None'}`);

        // Assign warehouse to user
        user.warehouseId = warehouse._id;
        user.warehouse = warehouse._id; // Some models use 'warehouse' instead
        await user.save();

        console.log(`\n✅ Warehouse assigned successfully!`);
        console.log(`User: ${user.username}`);
        console.log(`Warehouse: ${warehouse.name} (${warehouse.code})`);
        console.log(`Warehouse ID: ${warehouse._id}`);

        console.log('\n💡 You can now use the POS system with this user.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await database.disconnect();
        process.exit(0);
    }
}

assignWarehouse();
