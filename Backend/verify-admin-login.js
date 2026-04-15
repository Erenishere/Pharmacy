const authService = require('./src/services/authService');
const mongoose = require('mongoose');
require('dotenv').config();

async function testLogin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const identifier = 'admin';
        const password = 'admin123';

        console.log(`Testing login for: ${identifier}`);
        const result = await authService.authenticate(identifier, password);
        console.log('Login Success!');
        console.log('User Role:', result.user.role);
        console.log('Token starts with:', result.accessToken.substring(0, 10));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Login Failed:', error.message);
        process.exit(1);
    }
}

testLogin();
