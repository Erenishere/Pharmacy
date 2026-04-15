const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB:', process.env.MONGODB_URI.split('@')[1]); // Log host part safely

        const users = await User.find({});
        console.log('Total Users found:', users.length);

        users.forEach(user => {
            console.log('---');
            console.log('Username:', user.username);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('IsActive:', user.isActive);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
