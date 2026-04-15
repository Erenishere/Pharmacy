const mongoose = require('mongoose');
require('dotenv').config();

async function checkRaw() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log('Raw Users in "users" collection:', users.length);
        users.forEach(u => console.log(' - ' + u.username));

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkRaw();
