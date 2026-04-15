const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function testSave() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({ username: { $in: ['ahmed', 'ali'] } });

        for (const user of users) {
            try {
                console.log(`\nTesting save for: ${user.username} (Role: ${user.role})`);
                user.lastLogin = new Date();
                await user.save();
                console.log('Success! User saved successfully.');
            } catch (err) {
                console.error(`Failed to save ${user.username}:`, err.message);
                if (err.errors) {
                    Object.keys(err.errors).forEach(key => {
                        console.error(`Field ${key}: ${err.errors[key].message}`);
                    });
                }
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Connection Error:', error);
    }
}

testSave();
