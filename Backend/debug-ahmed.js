const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Salesman = require('./src/models/Salesman');

async function debugData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy');
        console.log('Connected to MongoDB');

        const user = await User.findOne({ username: 'ahmed' });
        console.log('User Ahmed:', JSON.stringify(user, null, 2));

        if (user) {
            const salesman = await Salesman.findOne({ userId: user._id });
            console.log('Salesman Profile for Ahmed:', JSON.stringify(salesman, null, 2));
        } else {
            console.log('User ahmed not found');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

debugData();
