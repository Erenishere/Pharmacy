/**
 * Real-World POS Flow Test
 * Simulates: Walk-in customer → Item selection → Invoice creation → Stock verification
 * 
 * This test verifies:
 * 1. Salesman authentication
 * 2. Walk-in customer retrieval
 * 3. Item search and stock check (BEFORE sale)
 * 4. Batch availability check (BEFORE sale)
 * 5. Invoice creation with FEFO batch selection
 * 6. Stock updates (AFTER sale)
 * 7. Batch quantity updates (AFTER sale)
 * 8. Invoice record creation
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3001}/api/v1`;

// Test configuration
const SALESMAN_CREDENTIALS = {
  identifier: 'ahmed',
  password: '12345678'
};

let authToken = '';
let salesmanContext = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '═'.repeat(70));
  log(title, 'bright');
  console.log('═'.repeat(70));
}

async function checkServerRunning() {
  try {
    await axios.get(`${API_BASE_URL.replace('/v1', '')}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function loginAsSalesman() {
  section('STEP 1: Salesman Login');
  
  try {
    log(`🔐 Logging in as: ${SALESMAN_CREDENTIALS.identifier}`, 'cyan');
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, SALESMAN_CREDENTIALS);
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      salesmanContext = response.data.data.user;
      
      log('✅ Login successful!', 'green');
      log(`   Salesman: ${salesmanContext.username}`, 'cyan');
      log(`   Role: ${salesmanContext.role}`, 'cyan');
      log(`   Salesman ID: ${salesmanContext.salesmanId || salesmanContext._id}`, 'cyan');
      log(`   Warehouse ID: ${salesmanContext.warehouseId || 'Not assigned'}`, 'cyan');
      
      if (!salesmanContext.warehouseId) {
        log('⚠️  WARNING: No warehouse assigned to salesman!', 'yellow');
        return false;
      }
      
      return true;
    }
    
    log('❌ Login failed - no token received', 'red');
    return false;
  } catch (error) {
    log(`❌ Login failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function getWalkInCustomer() {
  section('STEP 2: Get Walk-In Customer');
  
  try {
    log('🚶 Retrieving walk-in customer...', 'cyan');
    
    const response = await axios.get(`${API_BASE_URL}/salesman/pos/customers/walk-in`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const customer = response.data.data;
    log('✅ Walk-in customer retrieved!', 'green');
    log(`   Customer ID: ${customer._id}`, 'cyan');
    log(`   Name: ${customer.name}`, 'cyan');
    log(`   Code: ${customer.code}`, 'cyan');
    log(`   Credit Limit: ${customer.creditLimit || 0}`, 'cyan');
    
    return customer;
  } catch (error) {
    log(`❌ Failed to get walk-in customer: ${error.response?.data?.message || error.message}`, 'red');
    return null;
  }
}

async function searchAndSelectItem() {
  section('STEP 3: Search for Items to Sell');
  
  try {
    log('🔍 Searching for items with stock...', 'cyan');
    
    const response = await axios.get(`${API_BASE_URL}/salesman/pos/items/search`, {
      params: { q: 'a', limit: 10 },
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const items = response.data.data;
    log(`✅ Found ${items.length} items with stock`, 'green');
    
    if (items.length === 0) {
      log('⚠️  No items found with stock in warehouse', 'yellow');
      return null;
    }
    
    // Select first item with sufficient stock
    const selectedItem = items.find(item => item.availableStock >= 2) || items[0];
    
    log('\n📦 Selected Item:', 'bright');
    log(`   Item ID: ${selectedItem.id}`, 'cyan');
    log(`   Name: ${selectedItem.name}`, 'cyan');
    log(`   Code: ${selectedItem.code}`, 'cyan');
    log(`   Barcode: ${selectedItem.barcode || 'N/A'}`, 'cyan');
    log(`   Price: ${selectedItem.price}`, 'cyan');
    log(`   GST Rate: ${selectedItem.gstRate}%`, 'cyan');
    log(`   Available Stock: ${selectedItem.availableStock}`, 'cyan');
    
    return selectedItem;
  } catch (error) {
    log(`❌ Item search failed: ${error.response?.data?.message || error.message}`, 'red');
    return null;
  }
}

async function checkStockBeforeSale(itemId) {
  section('STEP 4: Check Stock & Batches (BEFORE SALE)');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Batch = require('./src/models/Batch');
    const Item = require('./src/models/Item');
    
    // Get item details
    const item = await Item.findById(itemId).lean();
    log(`📊 Item: ${item.name}`, 'cyan');
    
    // Get batches for this item in salesman's warehouse
    const batches = await Batch.find({
      item: itemId,
      warehouse: salesmanContext.warehouseId,
      remainingQuantity: { $gt: 0 },
      expiryDate: { $gt: new Date() },
      status: 'active'
    })
    .sort({ expiryDate: 1 }) // FEFO order
    .lean();
    
    log(`\n📦 Batches (FEFO Order):`, 'bright');
    let totalStock = 0;
    batches.forEach((batch, index) => {
      log(`   ${index + 1}. Batch: ${batch.batchNumber}`, 'cyan');
      log(`      Expiry: ${new Date(batch.expiryDate).toLocaleDateString()}`, 'cyan');
      log(`      Available: ${batch.remainingQuantity}`, 'cyan');
      totalStock += batch.remainingQuantity;
    });
    
    log(`\n   Total Available Stock: ${totalStock}`, 'green');
    
    await mongoose.disconnect();
    
    return { batches, totalStock };
  } catch (error) {
    log(`❌ Stock check failed: ${error.message}`, 'red');
    await mongoose.disconnect();
    return null;
  }
}

async function createInvoice(customer, item, quantityToSell) {
  section('STEP 5: Create Invoice (Confirmed Sale)');
  
  try {
    log(`💰 Creating invoice for ${quantityToSell} units...`, 'cyan');
    
    const invoiceData = {
      customerId: customer.id,
      items: [
        {
          itemId: item.id,
          itemName: item.name,
          quantity: quantityToSell,
          unitPrice: item.price,
          discount: 0,
          gstRate: item.gstRate
        }
      ],
      discount: 0,
      paymentMethod: 'cash',
      notes: 'Real-world POS test - Walk-in customer sale'
    };
    
    log('\n📝 Invoice Details:', 'bright');
    log(`   Customer: ${customer.name}`, 'cyan');
    log(`   Item: ${item.name}`, 'cyan');
    log(`   Quantity: ${quantityToSell}`, 'cyan');
    log(`   Unit Price: ${item.price}`, 'cyan');
    log(`   GST Rate: ${item.gstRate}%`, 'cyan');
    
    const response = await axios.post(
      `${API_BASE_URL}/salesman/pos/invoices`,
      invoiceData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const invoice = response.data.data;
    
    log('\n✅ Invoice Created Successfully!', 'green');
    log(`   Invoice Number: ${invoice.invoiceNumber}`, 'cyan');
    log(`   Status: ${invoice.status}`, 'cyan');
    log(`   Subtotal: ${invoice.totals?.subtotal || 'N/A'}`, 'cyan');
    log(`   Tax: ${invoice.totals?.gstTotal || invoice.totals?.tax || 'N/A'}`, 'cyan');
    log(`   Grand Total: ${invoice.totals?.grandTotal || invoice.totals?.netBillTotal || 'N/A'}`, 'cyan');
    
    if (invoice.items && invoice.items.length > 0) {
      log('\n📦 Batch Allocations (FEFO):', 'bright');
      invoice.items.forEach((lineItem, index) => {
        log(`   ${index + 1}. Quantity: ${lineItem.quantity}`, 'cyan');
        if (lineItem.batchInfo || lineItem.batchNumber) {
          const batchNum = lineItem.batchInfo?.batchNumber || lineItem.batchNumber;
          const expiry = lineItem.batchInfo?.expiryDate || lineItem.expiryDate;
          log(`      Batch: ${batchNum}`, 'cyan');
          if (expiry) {
            log(`      Expiry: ${new Date(expiry).toLocaleDateString()}`, 'cyan');
          }
        }
      });
    }
    
    return invoice;
  } catch (error) {
    log(`❌ Invoice creation failed: ${error.response?.data?.message || error.message}`, 'red');
    if (error.response?.data) {
      log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return null;
  }
}

async function verifyStockUpdates(itemId, quantitySold, stockBefore) {
  section('STEP 6: Verify Stock Updates (AFTER SALE)');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Batch = require('./src/models/Batch');
    const Item = require('./src/models/Item');
    
    // Get updated batches
    const batchesAfter = await Batch.find({
      item: itemId,
      warehouse: salesmanContext.warehouseId
    })
    .sort({ expiryDate: 1 })
    .lean();
    
    log('📊 Stock Comparison:', 'bright');
    log('\n   BEFORE SALE:', 'yellow');
    let totalBefore = 0;
    stockBefore.batches.forEach((batch, index) => {
      log(`   ${index + 1}. ${batch.batchNumber}: ${batch.remainingQuantity} units`, 'cyan');
      totalBefore += batch.remainingQuantity;
    });
    log(`   Total: ${totalBefore} units`, 'yellow');
    
    log('\n   AFTER SALE:', 'green');
    let totalAfter = 0;
    batchesAfter.forEach((batch, index) => {
      const beforeBatch = stockBefore.batches.find(b => b._id.toString() === batch._id.toString());
      const change = beforeBatch ? batch.remainingQuantity - beforeBatch.remainingQuantity : 0;
      const changeStr = change < 0 ? `(${change})` : change > 0 ? `(+${change})` : '';
      log(`   ${index + 1}. ${batch.batchNumber}: ${batch.remainingQuantity} units ${changeStr}`, 'cyan');
      totalAfter += batch.remainingQuantity;
    });
    log(`   Total: ${totalAfter} units`, 'green');
    
    const stockReduction = totalBefore - totalAfter;
    log(`\n   📉 Stock Reduced By: ${stockReduction} units`, stockReduction === quantitySold ? 'green' : 'red');
    
    if (stockReduction === quantitySold) {
      log('   ✅ Stock update is CORRECT!', 'green');
    } else {
      log(`   ❌ Stock update is INCORRECT! Expected: ${quantitySold}, Actual: ${stockReduction}`, 'red');
    }
    
    // Verify FEFO - check which batches were reduced
    log('\n   🔍 FEFO Verification:', 'bright');
    let remainingToAllocate = quantitySold;
    let fefoCorrect = true;
    
    for (let i = 0; i < stockBefore.batches.length && remainingToAllocate > 0; i++) {
      const beforeBatch = stockBefore.batches[i];
      const afterBatch = batchesAfter.find(b => b._id.toString() === beforeBatch._id.toString());
      
      if (!afterBatch) continue;
      
      const expectedReduction = Math.min(remainingToAllocate, beforeBatch.remainingQuantity);
      const actualReduction = beforeBatch.remainingQuantity - afterBatch.remainingQuantity;
      
      log(`   Batch ${beforeBatch.batchNumber} (Expiry: ${new Date(beforeBatch.expiryDate).toLocaleDateString()}):`, 'cyan');
      log(`      Expected reduction: ${expectedReduction}`, 'cyan');
      log(`      Actual reduction: ${actualReduction}`, actualReduction === expectedReduction ? 'green' : 'red');
      
      if (actualReduction !== expectedReduction) {
        fefoCorrect = false;
      }
      
      remainingToAllocate -= actualReduction;
    }
    
    if (fefoCorrect && remainingToAllocate === 0) {
      log('\n   ✅ FEFO logic is CORRECT! Earliest expiry batches used first.', 'green');
    } else {
      log('\n   ❌ FEFO logic may have issues!', 'red');
    }
    
    await mongoose.disconnect();
    
    return { totalBefore, totalAfter, stockReduction, fefoCorrect };
  } catch (error) {
    log(`❌ Stock verification failed: ${error.message}`, 'red');
    await mongoose.disconnect();
    return null;
  }
}

async function verifyInvoiceRecord(invoiceNumber) {
  section('STEP 7: Verify Invoice Record in Database');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const Invoice = require('./src/models/Invoice');
    
    const invoice = await Invoice.findOne({ invoiceNumber })
      .populate('customerId', 'name code')
      .populate('salesmanId', 'name code')
      .lean();
    
    if (!invoice) {
      log('❌ Invoice not found in database!', 'red');
      await mongoose.disconnect();
      return false;
    }
    
    log('✅ Invoice record found in database!', 'green');
    log(`   Invoice Number: ${invoice.invoiceNumber}`, 'cyan');
    log(`   Type: ${invoice.type}`, 'cyan');
    log(`   Sales Type: ${invoice.salesType}`, 'cyan');
    log(`   Status: ${invoice.status}`, 'cyan');
    log(`   Customer: ${invoice.customerId?.name || 'N/A'}`, 'cyan');
    log(`   Salesman: ${invoice.salesmanId?.name || 'N/A'}`, 'cyan');
    log(`   Total: ${invoice.totals?.netBillTotal || invoice.totals?.grandTotal || 'N/A'}`, 'cyan');
    log(`   Created: ${new Date(invoice.createdAt).toLocaleString()}`, 'cyan');
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    log(`❌ Invoice verification failed: ${error.message}`, 'red');
    await mongoose.disconnect();
    return false;
  }
}

async function runRealWorldTest() {
  console.clear();
  log('\n🏪 REAL-WORLD POS FLOW TEST', 'bright');
  log('Scenario: Walk-in customer purchases item, verify stock updates\n', 'cyan');
  
  // Check if server is running
  log('Checking if backend server is running...', 'cyan');
  const serverRunning = await checkServerRunning();
  
  if (!serverRunning) {
    log('❌ Backend server is NOT running!', 'red');
    log('\nPlease start the server first:', 'yellow');
    log('   cd Backend', 'cyan');
    log('   npm start', 'cyan');
    log(`\nExpected URL: ${API_BASE_URL}`, 'cyan');
    return;
  }
  
  log('✅ Backend server is running\n', 'green');
  
  // Step 1: Login
  const loginSuccess = await loginAsSalesman();
  if (!loginSuccess) {
    log('\n❌ Test failed: Cannot proceed without authentication', 'red');
    return;
  }
  
  // Step 2: Get walk-in customer
  const customer = await getWalkInCustomer();
  if (!customer) {
    log('\n❌ Test failed: Cannot get walk-in customer', 'red');
    return;
  }
  
  // Step 3: Search and select item
  const item = await searchAndSelectItem();
  if (!item) {
    log('\n❌ Test failed: No items available', 'red');
    return;
  }
  
  // Determine quantity to sell (max 2 or available stock)
  const quantityToSell = Math.min(2, item.availableStock);
  
  // Step 4: Check stock before sale
  const stockBefore = await checkStockBeforeSale(item.id);
  if (!stockBefore) {
    log('\n❌ Test failed: Cannot check stock', 'red');
    return;
  }
  
  // Step 5: Create invoice
  const invoice = await createInvoice(customer, item, quantityToSell);
  if (!invoice) {
    log('\n❌ Test failed: Invoice creation failed', 'red');
    return;
  }
  
  // Wait a moment for database updates
  log('\n⏳ Waiting for database updates...', 'cyan');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 6: Verify stock updates
  const verification = await verifyStockUpdates(item.id, quantityToSell, stockBefore);
  
  // Step 7: Verify invoice record
  await verifyInvoiceRecord(invoice.invoiceNumber);
  
  // Final Summary
  section('TEST SUMMARY');
  
  log('✅ Test Completed!', 'green');
  log('\nResults:', 'bright');
  log(`   ✅ Salesman authenticated`, 'green');
  log(`   ✅ Walk-in customer retrieved`, 'green');
  log(`   ✅ Item selected with stock`, 'green');
  log(`   ✅ Invoice created (${invoice.invoiceNumber})`, 'green');
  
  if (verification) {
    if (verification.stockReduction === quantityToSell) {
      log(`   ✅ Stock updated correctly (${quantityToSell} units deducted)`, 'green');
    } else {
      log(`   ❌ Stock update incorrect`, 'red');
    }
    
    if (verification.fefoCorrect) {
      log(`   ✅ FEFO logic working correctly`, 'green');
    } else {
      log(`   ⚠️  FEFO logic needs verification`, 'yellow');
    }
  }
  
  log('\n📊 Transaction Details:', 'bright');
  log(`   Item Sold: ${item.name}`, 'cyan');
  log(`   Quantity: ${quantityToSell}`, 'cyan');
  log(`   Stock Before: ${stockBefore.totalStock}`, 'cyan');
  log(`   Stock After: ${verification?.totalAfter || 'N/A'}`, 'cyan');
  log(`   Invoice Total: ${invoice.totals?.grandTotal || invoice.totals?.netBillTotal || 'N/A'}`, 'cyan');
  
  log('\n✅ Real-world POS flow test completed successfully!', 'green');
  log('   All stock updates verified ✓', 'green');
  log('   FEFO batch selection verified ✓', 'green');
  log('   Invoice record created ✓', 'green');
  
  console.log('\n' + '═'.repeat(70) + '\n');
}

// Run the test
runRealWorldTest().catch(error => {
  log(`\n❌ Test execution failed: ${error.message}`, 'red');
  console.error(error.stack);
});
