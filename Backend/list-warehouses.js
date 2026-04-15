const mongoose = require('mongoose');
require('dotenv').config();

const Warehouse = require('./src/models/Warehouse');

async function listWarehouses() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy');
        console.log('Connected to MongoDB');

        const warehouses = await Warehouse.find({});
        console.log('Total Warehouses:', warehouses.length);
        console.log('Warehouses:', JSON.stringify(warehouses, null, 2));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

listWarehouses();
