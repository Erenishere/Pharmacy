const mongoose = require('mongoose');
require('dotenv').config();

const Salesman = require('./src/models/Salesman');

async function assignWarehouse() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy');
        console.log('Connected to MongoDB');

        const warehouseId = '698ed3d3b0be298a6cd87360'; // Main Warehouse
        const result = await Salesman.updateOne(
            { name: 'ahmed' },
            { $set: { warehouseId: warehouseId } }
        );

        console.log('Update Result:', result);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

assignWarehouse();
