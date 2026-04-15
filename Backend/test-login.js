const mongoose = require('mongoose');
const authService = require('./src/services/authService');
require('dotenv').config();

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const identifiers = ['ahmed', 'ali'];
    const password = 'password123'; // Assuming this is the password for testing

    for (const id of identifiers) {
      try {
        console.log(`\nTesting login for: ${id}`);
        const result = await authService.authenticate(id, password);
        console.log('Success:', result.user.username, result.user.role);
      } catch (err) {
        console.error(`Failed for ${id}:`, err.message);
        if (err.errors) console.error('Validation errors:', err.errors);
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Connection Error:', error);
  }
}

testLogin();
