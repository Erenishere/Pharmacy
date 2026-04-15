require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models
const User = require('./src/models/User');
const Customer = require('./src/models/Customer');
const Item = require('./src/models/Item');
const Warehouse = require('./src/models/Warehouse');
const Supplier = require('./src/models/Supplier');
const Category = require('./src/models/category');
const SubCategory = require('./src/models/subcategory');
const Route = require('./src/models/Route');
const Area = require('./src/models/area');
const Town = require('./src/models/town');
const Salesman = require('./src/models/Salesman');
const TaxConfig = require('./src/models/TaxConfig');
const Inventory = require('./src/models/Inventory');
const Batch = require('./src/models/Batch');
const Transporter = require('./src/models/Transporter');
const Company = require('./src/models/Company');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
    });
    console.log('✓ Connected to MongoDB');

    // 1. Seed Company
    console.log('\n📊 Seeding Company...');
    const company = await Company.findOneAndUpdate(
      { code: 'INDUS-001' },
      {
        code: 'INDUS-001',
        name: 'Indus Traders',
        address: '123 Main Street, Karachi',
        phone: '+92-21-1234567',
        email: 'info@industraders.com',
        gstNumber: 'GST-123456789',
        logo: '',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('✓ Company created');

    // 2. Seed Tax Configurations
    console.log('\n💰 Seeding Tax Configurations...');
    const taxConfigs = [
      { 
        code: 'GST-0', 
        name: 'GST Zero Rated', 
        type: 'GST',
        rate: 0, 
        description: 'Zero Rated GST', 
        isActive: true,
        isDefault: false,
        applicableOn: 'both'
      },
      { 
        code: 'GST-4', 
        name: 'GST Reduced Rate', 
        type: 'GST',
        rate: 0.04, 
        description: 'Reduced Rate GST 4%', 
        isActive: true,
        isDefault: false,
        applicableOn: 'both'
      },
      { 
        code: 'GST-18', 
        name: 'GST Standard Rate', 
        type: 'GST',
        rate: 0.18, 
        description: 'Standard Rate GST 18%', 
        isActive: true,
        isDefault: true,
        applicableOn: 'both'
      }
    ];
    
    for (const tax of taxConfigs) {
      await TaxConfig.findOneAndUpdate(
        { code: tax.code },
        tax,
        { upsert: true, new: true }
      );
    }
    console.log('✓ Tax configurations created');

    // 3. Seed Areas, Towns, Routes
    console.log('\n🗺️  Seeding Geographic Data...');
    const areas = [];
    const areaNames = ['North Karachi', 'South Karachi', 'East Karachi', 'West Karachi', 'Central Karachi'];
    
    for (const areaName of areaNames) {
      const area = await Area.findOneAndUpdate(
        { name: areaName },
        { name: areaName, isActive: true },
        { upsert: true, new: true }
      );
      areas.push(area);
    }
    console.log(`✓ ${areas.length} areas created`);

    const towns = [];
    const townData = [
      { name: 'Gulshan-e-Iqbal', area: areas[0]._id },
      { name: 'Clifton', area: areas[1]._id },
      { name: 'Malir', area: areas[2]._id },
      { name: 'Orangi', area: areas[3]._id },
      { name: 'Saddar', area: areas[4]._id }
    ];
    
    for (const townInfo of townData) {
      const town = await Town.findOneAndUpdate(
        { name: townInfo.name },
        { ...townInfo, isActive: true },
        { upsert: true, new: true }
      );
      towns.push(town);
    }
    console.log(`✓ ${towns.length} towns created`);

    const routes = [];
    const routeData = [
      { code: 'RT-001', name: 'Route North', area: areas[0]._id, towns: [towns[0]._id] },
      { code: 'RT-002', name: 'Route South', area: areas[1]._id, towns: [towns[1]._id] },
      { code: 'RT-003', name: 'Route East', area: areas[2]._id, towns: [towns[2]._id] }
    ];
    
    for (const routeInfo of routeData) {
      const route = await Route.findOneAndUpdate(
        { code: routeInfo.code },
        { ...routeInfo, isActive: true },
        { upsert: true, new: true }
      );
      routes.push(route);
    }
    console.log(`✓ ${routes.length} routes created`);

    // 4. Seed Warehouses
    console.log('\n🏭 Seeding Warehouses...');
    const warehouses = [];
    const warehouseData = [
      { code: 'WH-001', name: 'Main Warehouse', location: 'Karachi Central', type: 'main' },
      { code: 'WH-002', name: 'North Branch', location: 'North Karachi', type: 'branch' },
      { code: 'WH-003', name: 'South Branch', location: 'South Karachi', type: 'branch' }
    ];
    
    for (const whData of warehouseData) {
      const warehouse = await Warehouse.findOneAndUpdate(
        { code: whData.code },
        { ...whData, isActive: true },
        { upsert: true, new: true }
      );
      warehouses.push(warehouse);
    }
    console.log(`✓ ${warehouses.length} warehouses created`);

    // 5. Seed Users and Salesmen
    console.log('\n👥 Seeding Users...');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // Admin User
    const adminUser = await User.findOneAndUpdate(
      { username: 'admin' },
      {
        username: 'admin',
        email: 'admin@industraders.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      },
      { upsert: true, new: true }
    );
    console.log('✓ Admin user created');

    // Salesman Users
    const salesmen = [];
    const salesmanData = [
      { username: 'salesman1', name: 'Ahmed Khan', route: routes[0]._id, warehouse: warehouses[0]._id },
      { username: 'salesman2', name: 'Ali Raza', route: routes[1]._id, warehouse: warehouses[1]._id },
      { username: 'salesman3', name: 'Hassan Ahmed', route: routes[2]._id, warehouse: warehouses[2]._id }
    ];
    
    for (const sData of salesmanData) {
      const user = await User.findOneAndUpdate(
        { username: sData.username },
        {
          username: sData.username,
          email: `${sData.username}@industraders.com`,
          password: hashedPassword,
          role: 'salesman',
          isActive: true
        },
        { upsert: true, new: true }
      );

      const salesman = await Salesman.findOneAndUpdate(
        { userId: user._id },
        {
          userId: user._id,
          code: `SM-${sData.username.slice(-3).toUpperCase()}`,
          name: sData.name,
          phone: `+92-300-${Math.floor(Math.random() * 9000000) + 1000000}`,
          cnic: `42101-${Math.floor(Math.random() * 9000000) + 1000000}-${Math.floor(Math.random() * 9)}`,
          address: 'Karachi, Pakistan',
          routeId: sData.route,
          warehouseId: sData.warehouse,
          isActive: true
        },
        { upsert: true, new: true }
      );
      salesmen.push(salesman);
    }
    console.log(`✓ ${salesmen.length} salesmen created`);

    // 6. Seed Categories and Subcategories
    console.log('\n📦 Seeding Categories...');
    const categories = [];
    const categoryData = [
      { name: 'Medicines', description: 'Pharmaceutical products' },
      { name: 'Surgical Items', description: 'Surgical equipment' },
      { name: 'Personal Care', description: 'Personal care products' }
    ];
    
    for (const catData of categoryData) {
      const category = await Category.findOneAndUpdate(
        { name: catData.name },
        { ...catData, isActive: true },
        { upsert: true, new: true }
      );
      categories.push(category);
    }
    console.log(`✓ ${categories.length} categories created`);

    const subcategories = [];
    const subcategoryData = [
      { name: 'Tablets', category: categories[0]._id },
      { name: 'Syrups', category: categories[0]._id },
      { name: 'Injections', category: categories[0]._id },
      { name: 'Bandages', category: categories[1]._id },
      { name: 'Gloves', category: categories[1]._id }
    ];
    
    for (const subData of subcategoryData) {
      const subcategory = await SubCategory.findOneAndUpdate(
        { name: subData.name },
        { ...subData, isActive: true },
        { upsert: true, new: true }
      );
      subcategories.push(subcategory);
    }
    console.log(`✓ ${subcategories.length} subcategories created`);

    // 7. Seed Suppliers
    console.log('\n🏢 Seeding Suppliers...');
    const suppliers = [];
    const supplierData = [
      { code: 'SUP-001', name: 'PharmaCorp Ltd', contactPerson: 'John Doe', phone: '+92-21-1111111' },
      { code: 'SUP-002', name: 'MediSupply Co', contactPerson: 'Jane Smith', phone: '+92-21-2222222' },
      { code: 'SUP-003', name: 'HealthCare Distributors', contactPerson: 'Bob Wilson', phone: '+92-21-3333333' }
    ];
    
    for (const supData of supplierData) {
      const supplier = await Supplier.findOneAndUpdate(
        { code: supData.code },
        {
          ...supData,
          email: `${supData.code.toLowerCase()}@supplier.com`,
          address: 'Karachi, Pakistan',
          isActive: true
        },
        { upsert: true, new: true }
      );
      suppliers.push(supplier);
    }
    console.log(`✓ ${suppliers.length} suppliers created`);

    // 8. Seed Transporters
    console.log('\n🚚 Seeding Transporters...');
    const transporters = [];
    const transporterData = [
      { code: 'TRN-001', name: 'Fast Logistics', contactPerson: 'Transport Manager 1', phone: '+92-300-1111111' },
      { code: 'TRN-002', name: 'Quick Delivery', contactPerson: 'Transport Manager 2', phone: '+92-300-2222222' }
    ];
    
    for (const trnData of transporterData) {
      const transporter = await Transporter.findOneAndUpdate(
        { code: trnData.code },
        {
          ...trnData,
          email: `${trnData.code.toLowerCase()}@transport.com`,
          address: 'Karachi, Pakistan',
          vehicleType: 'Truck',
          isActive: true
        },
        { upsert: true, new: true }
      );
      transporters.push(transporter);
    }
    console.log(`✓ ${transporters.length} transporters created`);

    // 9. Seed Customers
    console.log('\n👤 Seeding Customers...');
    const customers = [];
    
    // Walk-in Customer
    const walkInCustomer = await Customer.findOneAndUpdate(
      { code: 'CUST-WALKIN' },
      {
        code: 'CUST-WALKIN',
        name: 'Walk-In Customer',
        type: 'walkin',
        phone: 'N/A',
        address: 'N/A',
        isActive: true
      },
      { upsert: true, new: true }
    );
    customers.push(walkInCustomer);

    // Regular Customers
    const customerData = [
      { code: 'CUST-001', name: 'City Pharmacy', type: 'pharmacy', route: routes[0]._id, town: towns[0]._id },
      { code: 'CUST-002', name: 'Health Plus Store', type: 'pharmacy', route: routes[1]._id, town: towns[1]._id },
      { code: 'CUST-003', name: 'MediCare Center', type: 'pharmacy', route: routes[2]._id, town: towns[2]._id },
      { code: 'CUST-004', name: 'Wellness Pharmacy', type: 'pharmacy', route: routes[0]._id, town: towns[0]._id },
      { code: 'CUST-005', name: 'Quick Meds', type: 'pharmacy', route: routes[1]._id, town: towns[1]._id }
    ];
    
    for (const custData of customerData) {
      const customer = await Customer.findOneAndUpdate(
        { code: custData.code },
        {
          ...custData,
          phone: `+92-21-${Math.floor(Math.random() * 9000000) + 1000000}`,
          email: `${custData.code.toLowerCase()}@customer.com`,
          address: 'Karachi, Pakistan',
          creditLimit: 100000,
          isActive: true
        },
        { upsert: true, new: true }
      );
      customers.push(customer);
    }
    console.log(`✓ ${customers.length} customers created`);

    // 10. Seed Items with Inventory
    console.log('\n💊 Seeding Items with Inventory...');
    const items = [];
    const itemData = [
      { 
        code: 'ITM-001', 
        name: 'Paracetamol 500mg', 
        category: categories[0]._id, 
        subcategory: subcategories[0]._id,
        purchasePrice: 50,
        salePrice: 80,
        gstRate: 18
      },
      { 
        code: 'ITM-002', 
        name: 'Amoxicillin 250mg', 
        category: categories[0]._id, 
        subcategory: subcategories[0]._id,
        purchasePrice: 120,
        salePrice: 180,
        gstRate: 18
      },
      { 
        code: 'ITM-003', 
        name: 'Cough Syrup 100ml', 
        category: categories[0]._id, 
        subcategory: subcategories[1]._id,
        purchasePrice: 80,
        salePrice: 120,
        gstRate: 18
      },
      { 
        code: 'ITM-004', 
        name: 'Vitamin C Tablets', 
        category: categories[0]._id, 
        subcategory: subcategories[0]._id,
        purchasePrice: 150,
        salePrice: 220,
        gstRate: 4
      },
      { 
        code: 'ITM-005', 
        name: 'Surgical Gloves (Box)', 
        category: categories[1]._id, 
        subcategory: subcategories[4]._id,
        purchasePrice: 300,
        salePrice: 450,
        gstRate: 18
      },
      { 
        code: 'ITM-006', 
        name: 'Bandage Roll', 
        category: categories[1]._id, 
        subcategory: subcategories[3]._id,
        purchasePrice: 40,
        salePrice: 60,
        gstRate: 0
      },
      { 
        code: 'ITM-007', 
        name: 'Hand Sanitizer 500ml', 
        category: categories[2]._id, 
        subcategory: null,
        purchasePrice: 100,
        salePrice: 150,
        gstRate: 18
      },
      { 
        code: 'ITM-008', 
        name: 'Face Masks (Pack of 50)', 
        category: categories[1]._id, 
        subcategory: null,
        purchasePrice: 200,
        salePrice: 300,
        gstRate: 4
      }
    ];
    
    for (const itemInfo of itemData) {
      const item = await Item.findOneAndUpdate(
        { code: itemInfo.code },
        {
          ...itemInfo,
          barcode: `BAR${itemInfo.code}`,
          unit: 'PCS',
          minStock: 10,
          maxStock: 1000,
          reorderLevel: 50,
          tax: { gstRate: itemInfo.gstRate },
          pricing: {
            purchasePrice: itemInfo.purchasePrice,
            salePrice: itemInfo.salePrice,
            mrp: itemInfo.salePrice * 1.1
          },
          isActive: true
        },
        { upsert: true, new: true }
      );
      items.push(item);

      // Create inventory and batches for each warehouse
      for (const warehouse of warehouses) {
        const batches = [
          {
            batchNumber: `BATCH-${itemInfo.code}-001`,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
            quantity: Math.floor(Math.random() * 200) + 100,
            purchasePrice: itemInfo.purchasePrice,
            salePrice: itemInfo.salePrice
          },
          {
            batchNumber: `BATCH-${itemInfo.code}-002`,
            expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // 2 years from now
            quantity: Math.floor(Math.random() * 150) + 50,
            purchasePrice: itemInfo.purchasePrice,
            salePrice: itemInfo.salePrice
          }
        ];

        const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);

        // Create Inventory record
        await Inventory.findOneAndUpdate(
          { item: item._id, warehouse: warehouse._id },
          {
            item: item._id,
            warehouse: warehouse._id,
            quantity: totalStock,
            reservedQuantity: 0,
            available: totalStock,
            lastUpdated: new Date()
          },
          { upsert: true, new: true }
        );

        // Create Batch records
        for (const batchData of batches) {
          await Batch.findOneAndUpdate(
            { 
              batchNumber: batchData.batchNumber,
              item: item._id,
              warehouse: warehouse._id
            },
            {
              batchNumber: batchData.batchNumber,
              item: item._id,
              warehouse: warehouse._id,
              quantity: batchData.quantity,
              remainingQuantity: batchData.quantity,
              expiryDate: batchData.expiryDate,
              manufacturingDate: new Date(),
              unitCost: batchData.purchasePrice,
              totalCost: batchData.purchasePrice * batchData.quantity,
              costPrice: batchData.purchasePrice,
              salePrice: batchData.salePrice,
              status: 'active'
            },
            { upsert: true, new: true }
          );
        }
      }
    }
    console.log(`✓ ${items.length} items created with inventory and batches`);

    // Summary
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Company: 1`);
    console.log(`   - Tax Configs: ${taxConfigs.length}`);
    console.log(`   - Areas: ${areas.length}`);
    console.log(`   - Towns: ${towns.length}`);
    console.log(`   - Routes: ${routes.length}`);
    console.log(`   - Warehouses: ${warehouses.length}`);
    console.log(`   - Users: ${salesmen.length + 1} (1 admin + ${salesmen.length} salesmen)`);
    console.log(`   - Salesmen: ${salesmen.length}`);
    console.log(`   - Categories: ${categories.length}`);
    console.log(`   - Subcategories: ${subcategories.length}`);
    console.log(`   - Suppliers: ${suppliers.length}`);
    console.log(`   - Transporters: ${transporters.length}`);
    console.log(`   - Customers: ${customers.length}`);
    console.log(`   - Items: ${items.length}`);
    console.log(`   - Inventory Records: ${items.length * warehouses.length}`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin: username=admin, password=password123');
    console.log('   Salesman1: username=salesman1, password=password123');
    console.log('   Salesman2: username=salesman2, password=password123');
    console.log('   Salesman3: username=salesman3, password=password123');

    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
