const mongoose = require('mongoose');
require('dotenv').config();

async function findBatches() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();

        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();
            if (collections.some(c => c.name === 'batches')) {
                console.log(`Found "batches" in database: ${dbName}`);
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

findBatches();
