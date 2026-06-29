const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const Invoice = require('../models/Invoice');
const CashReceipt = require('../models/CashReceipt');
const CashPayment = require('../models/CashPayment');
const Expense = require('../models/Expense');
const Item = require('../models/Item');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const User = require('../models/User');
const Account = require('../models/Account');
const ExpenseCategory = require('../models/ExpenseCategory');
const Inventory = require('../models/Inventory');
const Batch = require('../models/Batch');

const MONGO_URI = process.env.MONGODB_URI;

const getRandomDate = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
    date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
    return date;
};

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    const adminUser = await User.findOne({ username: 'admin' });
    const warehouse = await Warehouse.findOne({});
    const items = await Item.find({});
    const customers = await Customer.find({ type: 'customer' });
    const supplier = await Supplier.findOne({}) || await Customer.findOne({ type: 'supplier' });

    if (!adminUser || !warehouse || items.length === 0 || customers.length === 0 || !supplier) {
        console.error('Missing base data. Please run npm run seed first.');
        process.exit(1);
    }

    // 1. Ensure basic Accounts and Categories exist for Transactions
    let cashAccount = await Account.findOne({ accountType: 'asset', code: 'CASH-001' });
    if (!cashAccount) {
        cashAccount = await Account.create({ name: 'Main Cash Account', code: 'CASH-001', accountType: 'asset', isActive: true, createdBy: adminUser._id });
    }

    let expenseAccount = await Account.findOne({ accountType: 'expense', code: 'EXP-001' });
    if (!expenseAccount) {
        expenseAccount = await Account.create({ name: 'General Expenses', code: 'EXP-001', accountType: 'expense', isActive: true, createdBy: adminUser._id });
    }

    let utilityCategory = await ExpenseCategory.findOne({ categoryName: 'Utilities' });
    if (!utilityCategory) {
        utilityCategory = await ExpenseCategory.create({ categoryName: 'Utilities', description: 'Utility bills', isActive: true, createdBy: adminUser._id });
    }

    // Clear previous demo transactions
    await Invoice.deleteMany({});
    try { await CashReceipt.deleteMany({}); } catch(e) {}
    try { await CashPayment.deleteMany({}); } catch(e) {}
    try { await Expense.deleteMany({}); } catch(e) {}
    try { await Inventory.deleteMany({}); } catch(e) {}
    try { await Batch.deleteMany({}); } catch(e) {}
    
    // Generate Sales Invoices (Over 90 days)
    for (let i = 1; i <= 60; i++) {
        const customer = getRandomItem(customers);
        const invoiceDate = getRandomDate(90);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 15);
        
        // Random 1 to 3 items per invoice
        const numItems = Math.floor(Math.random() * 3) + 1;
        const invoiceItems = [];
        let lineTotalSum = 0;

        for (let j = 0; j < numItems; j++) {
            const item = getRandomItem(items);
            const qty = Math.floor(Math.random() * 50) + 10;
            const lineTotal = qty * (item.pricing?.salePrice || 100);
            lineTotalSum += lineTotal;
            
            invoiceItems.push({
                itemId: item._id,
                quantity: qty,
                unitPrice: item.pricing?.salePrice || 100,
                warehouseId: warehouse._id,
                gstRate: 0,
                lineTotal: lineTotal
            });
        }
        
        const isPaid = Math.random() > 0.3; // 70% paid, 30% confirmed (unpaid/due)

        await Invoice.create({
            invoiceNumber: 'SAL-DEMO-26-' + String(i).padStart(4, '0'),
            type: 'sales',
            customerId: customer._id,
            invoiceDate: invoiceDate,
            dueDate: dueDate,
            status: isPaid ? 'paid' : 'confirmed',
            items: invoiceItems,
            totals: {
                subtotal: lineTotalSum,
                grandTotal: lineTotalSum,
                balanceDue: isPaid ? 0 : lineTotalSum
            },
            createdBy: adminUser._id
        });
    }
    console.log(`Created 60 Sales Invoices.`);

    // Generate Purchase Invoices
    for (let i = 1; i <= 25; i++) {
        const invoiceDate = getRandomDate(90);
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        
        const item = getRandomItem(items);
        const qty = Math.floor(Math.random() * 200) + 50;
        const lineTotal = qty * (item.pricing?.costPrice || 50);
        
        const isPaid = Math.random() > 0.5;

        await Invoice.create({
            invoiceNumber: 'PUR-DEMO-26-' + String(i).padStart(4, '0'),
            type: 'purchase',
            supplierId: supplier._id,
            supplierBillNo: 'BILL-DEMO-26-' + String(i).padStart(4, '0'),
            invoiceDate: invoiceDate,
            dueDate: dueDate,
            status: isPaid ? 'paid' : 'confirmed',
            items: [{
                itemId: item._id,
                quantity: qty,
                unitPrice: item.pricing?.costPrice || 50,
                warehouseId: warehouse._id,
                gstRate: 0,
                lineTotal: lineTotal
            }],
            totals: {
                subtotal: lineTotal,
                grandTotal: lineTotal,
                balanceDue: isPaid ? 0 : lineTotal
            },
            createdBy: adminUser._id
        });
    }
    console.log(`Created 25 Purchase Invoices.`);
    
    // Generate Cash Receipts (Collections)
    for (let i = 1; i <= 50; i++) {
        const receiptDate = getRandomDate(90);
        const isPdc = Math.random() > 0.8; // 20% PDC
        
        const pdcPayload = isPdc ? {
            postDatedCheque: true,
            bankDetails: {
                chequeNumber: 'CHQ-' + Math.floor(Math.random() * 999999),
                bankName: ['Meezan Bank', 'HBL', 'Standard Chartered'][Math.floor(Math.random() * 3)],
                chequeDate: new Date(receiptDate.getTime() + (Math.floor(Math.random() * 20) * 24 * 60 * 60 * 1000))
            },
            chequeStatus: 'pending',
            status: 'pending'
        } : {
            status: 'cleared'
        };

        try {
            await CashReceipt.create({
                receiptNumber: 'CR-DEMO-26-' + String(i).padStart(4, '0'),
                customerId: getRandomItem(customers)._id,
                receiptDate: receiptDate,
                amount: Math.floor(Math.random() * 50000) + 5000,
                paymentMethod: isPdc ? 'cheque' : 'cash',
                cashAccountId: cashAccount._id,
                createdBy: adminUser._id,
                ...pdcPayload
            });
        } catch (e) {
            // Ignore individual receipt errors
        }
    }
    console.log(`Created 50 Cash Receipts (Mix of Cleared & PDC).`);

    // Generate Cash Payments
    for (let i = 1; i <= 30; i++) {
        try {
            await CashPayment.create({
                paymentNumber: 'CP-DEMO-26-' + String(i).padStart(4, '0'),
                supplierId: supplier._id,
                paymentDate: getRandomDate(90),
                amount: Math.floor(Math.random() * 40000) + 10000,
                paymentMethod: 'cash',
                cashAccountId: cashAccount._id,
                status: 'cleared',
                createdBy: adminUser._id
            });
        } catch (e) { }
    }
    console.log(`Created 30 Cash Payments.`);

    // Generate Expenses
    const expenseTypes = ['Electricity Bill', 'Office Supplies', 'Maintenance', 'Internet Bill', 'Fuel'];
    for (let i = 1; i <= 20; i++) {
        try {
            await Expense.create({
                expenseNumber: 'EXP-DEMO-26-' + String(i).padStart(4, '0'),
                date: getRandomDate(90),
                amount: Math.floor(Math.random() * 15000) + 2000,
                title: 'Operating Expense',
                categoryId: utilityCategory._id,
                accountId: expenseAccount._id,
                cashAccountId: cashAccount._id,
                description: getRandomItem(expenseTypes),
                paymentMethod: 'cash',
                status: 'approved',
                createdBy: adminUser._id
            });
        } catch(e) {}
    }
    console.log(`Created 20 Expenses.`);

    // Generate Inventory & Batches
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        await Batch.create({
            batchNumber: 'BATCH-D26-' + item.code,
            item: item._id,
            warehouse: warehouse._id,
            manufacturingDate: new Date(),
            expiryDate: new Date(Date.now() + (Math.floor(Math.random() * 100) + 30) * 24 * 60 * 60 * 1000), 
            quantity: 1500,
            remainingQuantity: Math.floor(Math.random() * 1000) + 100, // random open stock
            unitCost: item.pricing?.costPrice || 50,
            totalCost: 1500 * (item.pricing?.costPrice || 50),
            status: 'active',
            createdBy: adminUser._id
        });

        await Inventory.create({
            item: item._id,
            warehouse: warehouse._id,
            quantity: Math.floor(Math.random() * 1000) + 100,
            status: 'available'
        });
    }
    console.log(`Created Inventory & Batches.`);
    
    console.log('Mass Demo Data Seed Completed!');
    process.exit(0);
}

seed();
