
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function debugRequest() {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const User = require('./models/User');
        const authService = require('./services/authService');
        const request = require('supertest');
        const app = require('./app');

        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log('No admin user found');
            process.exit(1);
        }

        const token = authService.generateAccessToken({ userId: admin._id, role: admin.role });

        console.log('--- Testing isActive=true (string) ---');
        const res1 = await request(app)
            .get('/api/v1/schemes?isActive=true')
            .set('Authorization', `Bearer ${token}`);
        console.log('isActive=true Status:', res1.status);

        console.log('--- Testing isActive=invalid ---');
        const res2 = await request(app)
            .get('/api/v1/schemes?isActive=invalid')
            .set('Authorization', `Bearer ${token}`);
        console.log('isActive=invalid Status:', res2.status);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

debugRequest();
