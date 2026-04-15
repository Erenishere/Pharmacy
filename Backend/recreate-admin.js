const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function recreateAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const username = 'admin';
        const email = 'admin@pharma.com';
        const password = 'admin123';

        // Delete existing if any
        await User.deleteMany({ $or: [{ username }, { email }] });
        console.log('Cleaned up previous admin users');

        // Create new
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = new User({
            username,
            email,
            password: hashedPassword, // The pre-save hook might hash it again if we are not careful, but let's see.
            // Actually, if I use 'new User' and 'save', the hook WILL run.
            // If I want to be safe and let the hook handle it:
            role: 'admin',
            isActive: true
        });

        // Wait, let's use the plain password and let the hook handle it to be consistent with the model logic.
        admin.password = password;

        await admin.save();
        console.log('Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

recreateAdmin();
