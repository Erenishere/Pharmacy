const mongoose = require('mongoose');
const User = require('./src/models/User');
const authService = require('./src/services/authService');
require('dotenv').config();

async function debugAhmedLogin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const username = 'ahmed';
        const user = await User.findOne({ username });

        if (!user) {
            console.log('User ahmed not found');
            return;
        }

        console.log('User found:', user.username, 'Role:', user.role);

        // We don't have the real password, but we can check if updateLastLogin works (which was the suspicious 500 cause)
        console.log('Testing updateLastLogin()...');
        try {
            await user.updateLastLogin();
            console.log('✅ updateLastLogin() SUCCESS');
        } catch (saveError) {
            console.error('❌ updateLastLogin() FAILED:', saveError.message);
            if (saveError.errors) {
                Object.keys(saveError.errors).forEach(key => {
                    console.error(`   Field ${key}: ${saveError.errors[key].message}`);
                });
            }
            return;
        }

        // Now check if generate tokens works
        console.log('Testing token generation...');
        try {
            const accessToken = authService.generateAccessToken({ userId: user._id, role: user.role });
            console.log('✅ Access Token generated');
            const refreshToken = authService.generateRefreshToken({ userId: user._id });
            console.log('✅ Refresh Token generated');
        } catch (tokenError) {
            console.error('❌ Token generation FAILED:', tokenError.message);
        }

        await mongoose.disconnect();
        console.log('Disconnected');
    } catch (error) {
        console.error('Debug script crash:', error);
    }
}

debugAhmedLogin();
