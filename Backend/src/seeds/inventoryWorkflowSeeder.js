/**
 * Inventory & Warehouse Workflow Seeder
 * Seeds the complete flow: Warehouses → Items → Batches → Inventory → Salesman with Warehouse
 *
 * Run: node src/seeds/inventoryWorkflowSeeder.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const database = require('../config/database');

const User = require('../models/User');
const Warehouse = require('../models/Warehouse');
const Item = require('../models/Item');
const Batch = require('../models/Batch');
const Inventory = require('../models/Inventory');
const Salesman = require('../models/Salesman');
const Customer = require('../models/Customer');
const Company = require('../models/Company');
const Category = require('../models/category');
const Business = require('../models/business');
const inventoryService = require('../services/inventoryService');

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

async function seed() {
  try {
    console.log('\n=== Inventory & Warehouse Workflow Seeder ===\n');
    await database.connect();

    // ─── Step 1: Ensure admin & sales users exist ──────────────────────
    console.log('1. Ensuring users exist...');
    let adminUser = await User.findOne({ username: 'admin' });
    if (!adminUser) {
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@industraders.com',
        password: 'Admin@123',
        role: 'admin',
        isActive: true,
      });
      console.log('   Created admin user (admin / Admin@123)');
    } else {
      console.log('   Admin user already exists');
    }

    let salesUser = await User.findOne({ username: 'sales_user' });
    if (!salesUser) {
      salesUser = await User.create({
        username: 'sales_user',
        email: 'sales@industraders.com',
        password: 'Sales@123',
        role: 'sales',
        isActive: true,
      });
      console.log('   Created sales_user (sales_user / Sales@123)');
    } else {
      console.log('   sales_user already exists');
    }

    // ─── Step 2: Create Warehouses ─────────────────────────────────────
    console.log('\n2. Creating warehouses...');
    await Warehouse.deleteMany({});
    const warehouseData = [
      {
        code: 'WH0001',
        name: 'Main Warehouse - Karachi',
        location: { address: '123 Industrial Area, SITE', city: 'Karachi', state: 'Sindh', country: 'Pakistan', postalCode: '75700' },
        contact: { phone: '+92-21-1234567', email: 'main.warehouse@pharma.com' },
        isActive: true,
        capacity: 10000,
        manager: adminUser._id,
      },
      {
        code: 'WH0002',
        name: 'Branch Warehouse - Lahore',
        location: { address: '45 Sundar Industrial Estate', city: 'Lahore', state: 'Punjab', country: 'Pakistan', postalCode: '54000' },
        contact: { phone: '+92-42-9876543', email: 'lahore.warehouse@pharma.com' },
        isActive: true,
        capacity: 8000,
      },
      {
        code: 'WH0003',
        name: 'Branch Warehouse - Islamabad',
        location: { address: '78 I-9 Industrial Area', city: 'Islamabad', state: 'ICT', country: 'Pakistan', postalCode: '44000' },
        contact: { phone: '+92-51-5555555', email: 'islamabad.warehouse@pharma.com' },
        isActive: true,
        capacity: 5000,
      },
    ];
    const warehouses = await Warehouse.insertMany(warehouseData);
    console.log(`   Created ${warehouses.length} warehouses: ${warehouses.map(w => w.code).join(', ')}`);

    const mainWarehouse = warehouses[0]; // WH0001 - Karachi
    const lahoreWarehouse = warehouses[1]; // WH0002 - Lahore

    // ─── Step 3a: Ensure Category, Business Type, Company exist ────────
    console.log('\n3a. Ensuring category, business type, and company exist...');

    let medicineCategory = await Category.findOne({ name: 'Medicine' });
    if (!medicineCategory) {
      medicineCategory = await Category.create({ name: 'Medicine', isActive: true });
      console.log('   Created category: Medicine');
    } else {
      console.log('   Category "Medicine" already exists');
    }

    let medicineBusiness = await Business.findOne({ name: 'Medicine' });
    if (!medicineBusiness) {
      medicineBusiness = await Business.create({ name: 'Medicine', isActive: true });
      console.log('   Created business type: Medicine');
    } else {
      console.log('   Business type "Medicine" already exists');
    }

    let company = await Company.findOne({ name: 'GSK Pakistan' });
    if (!company) {
      company = await Company.create({
        code: 'GSK',
        name: 'GSK Pakistan',
        contactInfo: { phone: '021-1234567', email: 'info@gsk.pk', address: 'Karachi', city: 'Karachi', country: 'Pakistan' },
        isActive: true,
      });
      console.log('   Created company: GSK Pakistan');
    } else {
      console.log('   Company "GSK Pakistan" already exists');
    }

    // ─── Step 3b: Create Items ─────────────────────────────────────────
    console.log('\n3b. Creating pharmacy items...');
    const itemsToCreate = [
      {
        code: 'MED001',
        name: 'Panadol Extra 500mg',
        description: 'Pain relief and fever reduction',
        category: 'Medicine',
        categoryId: medicineCategory._id,
        businessTypeId: medicineBusiness._id,
        companyId: company._id,
        unit: 'pack',
        pricing: { costPrice: 150, salePrice: 200, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: { currentStock: 0, minimumStock: 20, maximumStock: 500 },
        isActive: true,
      },
      {
        code: 'MED002',
        name: 'Amoxil 500mg Capsules',
        description: 'Antibiotic for bacterial infections',
        category: 'Medicine',
        categoryId: medicineCategory._id,
        businessTypeId: medicineBusiness._id,
        companyId: company._id,
        unit: 'pack',
        pricing: { costPrice: 280, salePrice: 350, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: { currentStock: 0, minimumStock: 15, maximumStock: 300 },
        isActive: true,
      },
      {
        code: 'MED003',
        name: 'Brufen 400mg Tablets',
        description: 'Anti-inflammatory pain killer',
        category: 'Medicine',
        categoryId: medicineCategory._id,
        businessTypeId: medicineBusiness._id,
        companyId: company._id,
        unit: 'pack',
        pricing: { costPrice: 100, salePrice: 140, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: { currentStock: 0, minimumStock: 30, maximumStock: 600 },
        isActive: true,
      },
      {
        code: 'MED004',
        name: 'Augmentin 625mg',
        description: 'Broad spectrum antibiotic',
        category: 'Medicine',
        categoryId: medicineCategory._id,
        businessTypeId: medicineBusiness._id,
        companyId: company._id,
        unit: 'pack',
        pricing: { costPrice: 450, salePrice: 580, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: { currentStock: 0, minimumStock: 10, maximumStock: 200 },
        isActive: true,
      },
      {
        code: 'MED005',
        name: 'Flagyl 400mg Tablets',
        description: 'Antiprotozoal and antibacterial',
        category: 'Medicine',
        categoryId: medicineCategory._id,
        businessTypeId: medicineBusiness._id,
        companyId: company._id,
        unit: 'pack',
        pricing: { costPrice: 80, salePrice: 120, currency: 'PKR' },
        tax: { gstRate: 0, whtRate: 0, taxCategory: 'exempt' },
        inventory: { currentStock: 0, minimumStock: 25, maximumStock: 400 },
        isActive: true,
      },
    ];

    const items = [];
    for (const itemData of itemsToCreate) {
      let item = await Item.findOne({ code: itemData.code });
      if (!item) {
        item = await Item.create(itemData);
        console.log(`   Created item: ${item.code} - ${item.name}`);
      } else {
        console.log(`   Item already exists: ${item.code} - ${item.name}`);
      }
      items.push(item);
    }

    // ─── Step 4: Create Batches allocated to Warehouses ────────────────
    console.log('\n4. Creating batches and allocating to warehouses...');
    // Clear existing batches for our items
    await Batch.deleteMany({ item: { $in: items.map(i => i._id) } });
    // Clear existing inventory for our items
    await Inventory.deleteMany({ item: { $in: items.map(i => i._id) } });

    const now = new Date();
    const batchesCreated = [];

    for (const item of items) {
      // Batch 1: Allocated to Main Warehouse (Karachi) - good stock
      const batch1 = await Batch.create({
        batchNumber: `${item.code}-B1`,
        item: item._id,
        warehouse: mainWarehouse._id,
        manufacturingDate: addMonths(now, -3),
        expiryDate: addMonths(now, 18),
        quantity: 200,
        remainingQuantity: 200,
        unitCost: item.pricing.costPrice,
        totalCost: 200 * item.pricing.costPrice,
        status: 'active',
        notes: `Batch for ${item.name} at Main Warehouse`,
        referenceType: 'PURCHASE_ORDER',
        createdBy: adminUser._id,
      });
      batchesCreated.push(batch1);

      // Create Inventory record for Main Warehouse
      await Inventory.findOneAndUpdate(
        { item: item._id, warehouse: mainWarehouse._id },
        {
          $set: {
            item: item._id,
            warehouse: mainWarehouse._id,
            quantity: 200,
            available: 200,
            reservedQuantity: 0,
            lastUpdated: now,
          },
        },
        { upsert: true, new: true },
      );

      // Batch 2: Allocated to Lahore Warehouse - smaller stock
      const batch2 = await Batch.create({
        batchNumber: `${item.code}-B2`,
        item: item._id,
        warehouse: lahoreWarehouse._id,
        manufacturingDate: addMonths(now, -2),
        expiryDate: addMonths(now, 20),
        quantity: 100,
        remainingQuantity: 100,
        unitCost: item.pricing.costPrice,
        totalCost: 100 * item.pricing.costPrice,
        status: 'active',
        notes: `Batch for ${item.name} at Lahore Warehouse`,
        referenceType: 'PURCHASE_ORDER',
        createdBy: adminUser._id,
      });
      batchesCreated.push(batch2);

      // Create Inventory record for Lahore Warehouse
      await Inventory.findOneAndUpdate(
        { item: item._id, warehouse: lahoreWarehouse._id },
        {
          $set: {
            item: item._id,
            warehouse: lahoreWarehouse._id,
            quantity: 100,
            available: 100,
            reservedQuantity: 0,
            lastUpdated: now,
          },
        },
        { upsert: true, new: true },
      );

      // Sync item's currentStock from Inventory aggregation
      await inventoryService.syncItemCurrentStock(item._id);
    }

    console.log(`   Created ${batchesCreated.length} batches across 2 warehouses`);
    console.log(`   Main WH (Karachi): 200 units per item × ${items.length} items`);
    console.log(`   Lahore WH: 100 units per item × ${items.length} items`);

    // ─── Step 5: Assign Salesman to Warehouse ──────────────────────────
    console.log('\n5. Assigning salesman to Main Warehouse (Karachi)...');
    await Salesman.deleteMany({ $or: [{ userId: salesUser._id }, { code: 'SM0001' }] });

    const salesman = await Salesman.create({
      code: 'SM0001',
      name: 'Ahmed Sales',
      phone: '0300-1234567',
      email: 'ahmed.sales@industraders.com',
      userId: salesUser._id,
      commissionRate: 5,
      warehouseId: mainWarehouse._id, // <-- Assigned to Main Warehouse
      isActive: true,
      createdBy: adminUser._id,
    });

    console.log(`   Salesman ${salesman.code} (${salesman.name}) → Warehouse ${mainWarehouse.code} (${mainWarehouse.name})`);

    // ─── Step 6: Ensure Walk-in Customer exists ────────────────────────
    console.log('\n6. Ensuring walk-in customer exists...');
    let walkInCustomer = await Customer.findOne({ code: 'CUST-WALKIN' });
    if (!walkInCustomer) {
      walkInCustomer = await Customer.create({
        code: 'CUST-WALKIN',
        name: 'Walk-In Customer',
        type: 'customer',
        accountType: 'customer',
        contactInfo: { phone: 'N/A', email: 'walkin@pharma.com', address: 'Counter Sale', city: 'Local', country: 'Pakistan' },
        financialInfo: { creditLimit: 0, paymentTerms: 0, currency: 'PKR' },
        isActive: true,
      });
      console.log('   Created Walk-In Customer');
    } else {
      console.log('   Walk-In Customer already exists');
    }

    // Ensure a regular customer exists for testing
    let testCustomer = await Customer.findOne({ code: 'CUST-TEST' });
    if (!testCustomer) {
      testCustomer = await Customer.create({
        code: 'CUST-TEST',
        name: 'Test Pharmacy - Karachi',
        type: 'customer',
        accountType: 'customer',
        contactInfo: { phone: '0321-5555555', email: 'test@pharmacy.com', address: 'Main Market', city: 'Karachi', country: 'Pakistan' },
        financialInfo: { creditLimit: 100000, paymentTerms: 30, currency: 'PKR' },
        isActive: true,
      });
      console.log('   Created Test Customer (CUST-TEST)');
    } else {
      console.log('   Test Customer already exists');
    }

    // ─── Summary ───────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log('SEED COMPLETE! Here\'s what was created:');
    console.log('='.repeat(60));
    console.log('\nUsers:');
    console.log('  Admin:    admin / Admin@123');
    console.log('  Salesman: sales_user / Sales@123');
    console.log('\nWarehouses:');
    warehouses.forEach(w => console.log(`  ${w.code}: ${w.name}`));
    console.log('\nItems (with batches in each warehouse):');
    items.forEach(i => console.log(`  ${i.code}: ${i.name} (Sale: Rs.${i.pricing.salePrice})`));
    console.log('\nSalesman Assignment:');
    console.log(`  ${salesman.code} (${salesman.name}) → ${mainWarehouse.code} (${mainWarehouse.name})`);
    console.log('\nCustomers:');
    console.log('  CUST-WALKIN: Walk-In Customer');
    console.log('  CUST-TEST: Test Pharmacy - Karachi');
    console.log('\n' + '='.repeat(60));
    console.log('WORKFLOW TEST STEPS:');
    console.log('='.repeat(60));
    console.log('1. Login as admin (admin / Admin@123)');
    console.log('   - Go to Master Data → Salesmen tab → verify warehouse assignment');
    console.log('   - Go to Warehouses page → verify 3 warehouses');
    console.log('   - Go to Batches page → verify batches with warehouses');
    console.log('2. Login as sales_user (sales_user / Sales@123)');
    console.log('   - Go to POS → search for "Panadol" or "Amoxil"');
    console.log('   - Only items with stock in WH0001 (Karachi) should appear');
    console.log('   - Add items to cart → complete sale');
    console.log('   - Go to Sales Returns → search invoice → process return');
    console.log('='.repeat(60) + '\n');

    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\nSeed failed:', error);
    await database.disconnect();
    process.exit(1);
  }
}

seed();
