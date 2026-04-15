const mongoose = require('mongoose');
require('dotenv').config();

async function listDbs() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('Databases:', dbs.databases.map(db => db.name));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

listDbs();
