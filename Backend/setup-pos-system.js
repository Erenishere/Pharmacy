require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Warehouse = require('./src/models/Warehouse');
const Customer = require('./src/models/Customer');
const database = require('./src/config/database');

async function setupPOSSystem() {
    try {
        console.log('🚀 Setting up POS System...\n');
        console.log('Connecting to database...');
        await database.connect();

        // Step 1: Create default warehouse
        console.log('\n📦 Step 1: Creating default warehouse...');
        let warehouse = await Warehouse.findOne({ code: 'WH-MAIN' });
        
        if (!warehouse) {
            warehouse = await Warehouse.create({
                code: 'WH-MAIN',
                name: 'Main Warehouse',
                address: {
                    street: 'Main Street',
                    city: 'Karachi',
                    state: 'Sindh',
                    country: 'Pakistan',
                    postalCode: '75500'
                },
                contactInfo: {
                    phone: '021-1234567',
                    email: 'warehouse@industraders.com'
                },
                isActive: true,
                capacity: 10000,
                currentStock: 0
            });
            console.log('✅ Warehouse created:', warehouse.name, `(${warehouse.code})`);
        } else {
            console.log('✅ Warehouse already exists:', warehouse.name, `(${warehouse.code})`);
        }

        // Step 2: Create Walk-In customer
        console.log('\n👤 Step 2: Creating Walk-In customer...');
        let walkInCustomer = await Customer.findOne({ code: 'WALK-IN' });
        
        if (!walkInCustomer) {
            walkInCustomer = await Customer.create({
                code: 'WALK-IN',
                name: 'Walk-In Customer',
                type: 'retail',
                contactInfo: {
                    phone: 'N/A',
                    email: 'walkin@pos.local',
                    address: 'N/A'
                },
                businessDetails: {
                    creditAmountLimit: 0,
                    creditDaysLimit: 0
                },
                isActive: true
            });
            console.log('✅ Walk-In customer created');
        } else {
            console.log('✅ Walk-In customer already exists');
        }

        // Step 3: Find or create admin user
        console.log('\n👨‍💼 Step 3: Setting up admin user...');
        let adminUser = await User.findOne({ username: 'admin_new' });
        
        if (!adminUser) {
            adminUser = await User.findOne({ username: 'admin' });
        }

        if (!adminUser) {
            console.log('Creating new admin user...');
            adminUser = new User({
                username: 'admin',
                email: 'admin@industraders.com',
                password: 'Admin@123',
                role: 'admin',
                isActive: true,
                warehouseId: warehouse._id
            });
            await adminUser.save();
            console.log('✅ Admin user created');
            console.log('   Username: admin');
            console.log('   Password: Admin@123');
        } else {
            console.log('✅ Admin user found:', adminUser.username);
            
            // Assign warehouse if not already assigned
            if (!adminUser.warehouseId && !adminUser.warehouse) {
                adminUser.warehouseId = warehouse._id;
                adminUser.warehouse = warehouse._id;
                await adminUser.save();
                console.log('✅ Warehouse assigned to admin user');
            } else {
                console.log('✅ Admin user already has warehouse assigned');
            }
        }

        // Step 4: Create or update sales user
        console.log('\n🛒 Step 4: Setting up sales user...');
        let salesUser = await User.findOne({ username: 'salesman' });
        
        if (!salesUser) {
            salesUser = new User({
                username: 'salesman',
                email: 'salesman@industraders.com',
                password: 'Sales@123',
                role: 'sales',
                name: 'Ahmed Khan',
                isActive: true,
                warehouseId: warehouse._id,
                warehouse: warehouse._id
            });
            await salesUser.save();
            console.log('✅ Sales user created');
            console.log('   Username: salesman');
            console.log('   Password: Sales@123');
        } else {
            console.log('✅ Sales user found:', salesUser.username);
            
            // Assign warehouse if not already assigned
            if (!salesUser.warehouseId && !salesUser.warehouse) {
                salesUser.warehouseId = warehouse._id;
                salesUser.warehouse = warehouse._id;
                await salesUser.save();
                console.log('✅ Warehouse assigned to sales user');
            } else {
                console.log('✅ Sales user already has warehouse assigned');
            }
        }

        // Summary
        console.log('\n' + '='.repeat(60));
        console.log('✅ POS SYSTEM SETUP COMPLETE!');
        console.log('='.repeat(60));
        console.log('\n📋 Summary:');
        console.log(`   Warehouse: ${warehouse.name} (${warehouse.code})`);
        console.log(`   Warehouse ID: ${warehouse._id}`);
        console.log(`   Walk-In Customer: ${walkInCustomer.name} (${walkInCustomer.code})`);
        console.log(`   Admin User: ${adminUser.username}`);
        console.log(`   Sales User: ${salesUser.username}`);
        
        console.log('\n🔐 Login Credentials:');
        console.log('   Admin:');
        console.log(`     Username: ${adminUser.username}`);
        console.log('     Password: Admin@123');
        console.log('   Salesman:');
        console.log(`     Username: ${salesUser.username}`);
        console.log('     Password: Sales@123');
        
        console.log('\n💡 Next Steps:');
        console.log('   1. Restart the backend server (if running)');
        console.log('   2. Login to the frontend with salesman credentials');
        console.log('   3. Access POS at: http://localhost:4200/salesman/pos');
        console.log('   4. Add items to the system before using POS');
        console.log('\n⚠️  Note: You need to add items with stock before you can create invoices!');

    } catch (error) {
        console.error('\n❌ Error during setup:', error);
        console.error(error.stack);
    } finally {
        await database.disconnect();
        process.exit(0);
    }
}

setupPOSSystem();
