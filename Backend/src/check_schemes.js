
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkData() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI not found in env');

        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const Scheme = require('./models/Scheme');

        // Find schemes
        const schemes = await Scheme.find({});
        console.log(`Found ${schemes.length} schemes`);

        let corruptCount = 0;
        for (const s of schemes) {
            if (!mongoose.Types.ObjectId.isValid(s.company)) {
                console.log(`[CORRUPT] Invalid company ID in scheme: "${s.name}" (ID: ${s._id}) -> Company: "${s.company}"`);
                corruptCount++;
            }
            if (s.claimAccountId && !mongoose.Types.ObjectId.isValid(s.claimAccountId)) {
                console.log(`[CORRUPT] Invalid claimAccountId in scheme: "${s.name}" (ID: ${s._id}) -> ClaimAccount: "${s.claimAccountId}"`);
                corruptCount++;
            }
        }

        if (corruptCount === 0) {
            console.log('No corrupt ObjectId found in Schemes.');
        } else {
            console.log(`Found ${corruptCount} potential data issues.`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkData();
