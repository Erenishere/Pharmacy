const mongoose = require('mongoose');
require('dotenv').config();

async function checkPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database\n');
    
    const User = require('./src/models/User');
    const user = await User.findOne({ username: 'ahmed' });
    
    if (!user) {
      console.log('User "ahmed" not found');
      
      // List all users
      const allUsers = await User.find().select('username email role isActive');
      console.log('\nAvailable users:');
      allUsers.forEach(u => {
        console.log(`  - ${u.username} (${u.role}) - Active: ${u.isActive}`);
      });
    } else {
      console.log('User found:');
      console.log(`  Username: ${user.username}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Active: ${user.isActive}`);
      console.log(`  Has Password: ${!!user.password}`);
      
      // Try to test password
      const bcrypt = require('bcryptjs');
      const testPasswords = ['ahmed123', 'ahmed', 'password', '123456', 'Ahmed123'];
      
      console.log('\nTesting common passwords:');
      for (const pwd of testPasswords) {
        const match = await bcrypt.compare(pwd, user.password);
        console.log(`  ${pwd}: ${match ? '✅ MATCH' : '❌'}`);
      }
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await mongoose.disconnect();
  }
}

checkPassword();
