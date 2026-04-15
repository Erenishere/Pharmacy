const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Customer = require('./src/models/Customer');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const customerId = '67a840c57173e351887e49e2';
    const customer = await Customer.findById(customerId);
    
    if (customer) {
      console.log('Customer Found:', {
        id: customer._id,
        name: customer.name,
        code: customer.code
      });
    } else {
      console.log('Customer NOT FOUND with ID:', customerId);
      
      const firstCustomer = await Customer.findOne();
      if (firstCustomer) {
        console.log('Example Customer in DB:', {
          id: firstCustomer._id,
          name: firstCustomer.name
        });
      } else {
        console.log('No customers found in the database at all.');
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

check();
