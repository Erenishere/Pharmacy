/**
 * List warehouses and salesmen for POS setup
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function listData() {
  try {
    console.log('📡 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected\n');

    const Warehouse = require('./src/models/Warehouse');
    const Salesman = require('./src/models/Salesman');
    const User = require('./src/models/User');

    // List warehouses
    console.log('📦 WAREHOUSES:');
    console.log('─'.repeat(60));
    const warehouses = await Warehouse.find().select('code name isActive').lean();
    
    if (warehouses.length === 0) {
      console.log('  ⚠️  No warehouses found in database');
    } else {
      warehouses.forEach(w => {
        console.log(`  ${w.isActive ? '✅' : '❌'} ${w.code.padEnd(10)} | ${w.name}`);
      });
    }

    // List salesmen
    console.log('\n👥 SALESMEN:');
    console.log('─'.repeat(60));
    const salesmen = await Salesman.find()
      .populate('userId', 'username role isActive')
      .populate('warehouseId', 'code name')
      .select('code name userId warehouseId isActive')
      .lean();
    
    if (salesmen.length === 0) {
      console.log('  ⚠️  No salesmen found in database');
    } else {
      salesmen.forEach(s => {
        const userInfo = s.userId ? `${s.userId.username} (${s.userId.role})` : 'No user linked';
        const warehouseInfo = s.warehouseId ? `${s.warehouseId.code} - ${s.warehouseId.name}` : 'No warehouse';
        const status = s.isActive ? '✅' : '❌';
        console.log(`  ${status} ${s.code.padEnd(10)} | ${s.name.padEnd(20)} | User: ${userInfo.padEnd(25)} | Warehouse: ${warehouseInfo}`);
      });
    }

    // List sales users
    console.log('\n🔐 SALES USERS:');
    console.log('─'.repeat(60));
    const salesUsers = await User.find({ 
      role: { $in: ['sales', 'salesman'] },
      isActive: true 
    }).select('username email role').lean();
    
    if (salesUsers.length === 0) {
      console.log('  ⚠️  No active sales users found');
    } else {
      for (const user of salesUsers) {
        const salesman = await Salesman.findOne({ userId: user._id })
          .populate('warehouseId', 'code name')
          .lean();
        
        const hasLink = salesman ? '✅' : '❌';
        const hasWarehouse = salesman?.warehouseId ? '✅' : '❌';
        const warehouseInfo = salesman?.warehouseId 
          ? `${salesman.warehouseId.code} - ${salesman.warehouseId.name}`
          : 'Not assigned';
        
        console.log(`  ${user.username.padEnd(20)} | Linked: ${hasLink} | Warehouse: ${hasWarehouse} | ${warehouseInfo}`);
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log('📋 SUMMARY:');
    console.log(`  Warehouses: ${warehouses.length}`);
    console.log(`  Salesmen: ${salesmen.length}`);
    console.log(`  Sales Users: ${salesUsers.length}`);
    
    const salesmenWithWarehouse = salesmen.filter(s => s.warehouseId).length;
    const salesmenWithoutWarehouse = salesmen.length - salesmenWithWarehouse;
    console.log(`  Salesmen with warehouse: ${salesmenWithWarehouse}`);
    console.log(`  Salesmen without warehouse: ${salesmenWithoutWarehouse}`);

    if (salesmenWithoutWarehouse > 0) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('  Some salesmen need warehouse assignment for POS access.');
      console.log('  Use: node assign-warehouse-to-salesman.js <salesmanCode> <warehouseCode>');
    } else if (salesmen.length > 0) {
      console.log('\n✅ All salesmen have warehouses assigned!');
    }

    await mongoose.disconnect();
    console.log('\n📡 Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
  }
}

listData();
