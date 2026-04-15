const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function checkAdminUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        // Check for admin user
        const adminUser = await User.findOne({ username: 'admin' });
        
        if (adminUser) {
            console.log('✅ Admin user found:');
            console.log('---');
            console.log('Username:', adminUser.username);
            console.log('Email:', adminUser.email);
            console.log('Role:', adminUser.role);
            console.log('IsActive:', adminUser.isActive);
            console.log('HasPassword:', !!adminUser.password);
            console.log('Created:', adminUser.createdAt);
            console.log('\n⚠️  Note: If isActive is false, the user cannot login.');
        } else {
            console.log('❌ No user with username "admin" found in database');
            console.log('\nChecking all users in database...\n');
            
            const allUsers = await User.find({}).select('username email role isActive');
            
            if (allUsers.length === 0) {
                console.log('❌ No users found in database at all!');
                console.log('\n💡 Solution: Run "node create-admin.js" to create an admin user');
            } else {
                console.log(`Found ${allUsers.length} user(s):\n`);
                allUsers.forEach((user, index) => {
                    console.log(`${index + 1}. Username: ${user.username}`);
                    console.log(`   Email: ${user.email}`);
                    console.log(`   Role: ${user.role}`);
                    console.log(`   Active: ${user.isActive}`);
                    console.log('');
                });
                
                console.log('💡 Try logging in with one of these usernames');
                console.log('💡 Or run "node create-admin.js" to create a new admin user');
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkAdminUser();
