const mongoose = require('mongoose');
require('dotenv').config();

// Require index.js to register most models
const models = require('./src/models/index');
const Batch = require('./src/models/Batch');

// Destructure models we need
const { Warehouse, Item, User, Salesman, Town } = models;

async function verifyActiveBatches() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy');
        console.log('Connected to MongoDB');

        // 1. Verify Main Warehouse
        const warehouseName = 'Main Warehouse';
        const warehouse = await Warehouse.findOne({ name: warehouseName });

        if (!warehouse) {
            console.log(`Warehouse '${warehouseName}' not found.`);
            const allWarehouses = await Warehouse.find({}, 'name code');
            console.log('Available Warehouses:', allWarehouses.map(w => `${w.name} (${w.code})`));
            await mongoose.disconnect();
            return;
        }

        console.log(`Found Warehouse: ${warehouse.name} (${warehouse._id})`);

        // 2. Verify User 'ahmed' and Salesman profile
        const username = 'ahmed';
        const user = await User.findOne({ username: new RegExp(username, 'i') });

        if (user) {
            console.log(`Found User '${username}': ${user._id}`);

            // Check Salesman profile
            const salesman = await Salesman.findOne({ userId: user._id }).populate('warehouseId');
            if (salesman) {
                console.log(`Found Salesman profile for user: ${salesman._id}`);
                let salesmanWarehouseName = 'NONE';
                let salesmanWarehouseId = null;

                if (salesman.warehouseId) {
                    if (salesman.warehouseId._id) {
                        salesmanWarehouseName = salesman.warehouseId.name;
                        salesmanWarehouseId = salesman.warehouseId._id.toString();
                    } else {
                        salesmanWarehouseId = salesman.warehouseId.toString();
                        salesmanWarehouseName = 'ID: ' + salesmanWarehouseId;
                    }
                }
                console.log(`Salesman assigned warehouse: ${salesmanWarehouseName} (${salesmanWarehouseId || 'None'})`);

                if (salesmanWarehouseId === warehouse._id.toString()) {
                    console.log('SUCCESS: Salesman profile is correctly assigned to Main Warehouse.');
                } else {
                    console.log('WARNING: Salesman profile is NOT assigned to Main Warehouse.');
                }

            } else {
                console.log('No Salesman profile found for this user.');
            }

        } else {
            console.log(`User '${username}' not found.`);
        }

        // 3. Check Batches
        const query = {
            warehouse: warehouse._id,
            status: 'active',
            remainingQuantity: { $gt: 0 }
        };

        const batchCount = await Batch.countDocuments(query);
        console.log(`Total Active Batches with Stock > 0: ${batchCount}`);

        if (batchCount > 0) {
            const samples = await Batch.find(query)
                .limit(5)
                .populate('item', 'name code');

            console.log('Sample Batches:');
            samples.forEach(b => {
                console.log(`- Item: ${b.item ? b.item.name : 'Unknown'} (${b.item ? b.item.code : 'No Code'})`);
                console.log(`  Batch: ${b.batchNumber}, Stock: ${b.remainingQuantity}, Expiry: ${b.expiryDate}`);
            });
        } else {
            console.log("No active batches found. Checking for any batches regardless of status/stock...");
            const anyBatches = await Batch.countDocuments({ warehouse: warehouse._id });
            console.log(`Total Batches (any status) in this warehouse: ${anyBatches}`);
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

verifyActiveBatches();
