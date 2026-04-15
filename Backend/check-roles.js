const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkRoles() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const counts = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);
        console.log('Role counts:', counts);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error during role check:', error);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

checkRoles();
