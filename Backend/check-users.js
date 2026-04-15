const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ username: { $in: ['ahmed', 'ali'] } });
        console.log('Users found:', users.length);

        users.forEach(user => {
            console.log('---');
            console.log('Username:', user.username);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('IsActive:', user.isActive);
            console.log('HasPassword:', !!user.password);
            console.log('Permissions:', JSON.stringify(user.permissions, null, 2));
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
