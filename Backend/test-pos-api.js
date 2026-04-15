/**
 * Test POS API endpoints
 * This script tests the POS backend by making actual API calls
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = `http://localhost:${process.env.PORT || 3001}/api/v1`;
let authToken = '';

// Test credentials (use one of the sales users)
const TEST_USER = {
  username: 'ahmed',
  password: 'ahmed123' // Update with actual password
};

async function login() {
  try {
    console.log('🔐 Logging in as sales user...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✅ Login successful');
      console.log(`   User: ${response.data.data.user.username}`);
      console.log(`   Role: ${response.data.data.user.role}`);
      return true;
    } else {
      console.log('❌ Login failed - no token received');
      return false;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testItemSearch() {
  try {
    console.log('\n📦 Testing item search...');
    const response = await axios.get(`${API_BASE_URL}/salesman/pos/items/search`, {
      params: { q: 'a', limit: 5 },
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Item search successful - Found ${response.data.count} items`);
    if (response.data.data.length > 0) {
      const item = response.data.data[0];
      console.log(`   Sample: ${item.name} (${item.code}) - Stock: ${item.availableStock}`);
      return item;
    }
    return null;
  } catch (error) {
    console.log('❌ Item search failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testBarcodeScanning(barcode) {
  try {
    console.log('\n🔍 Testing barcode scanning...');
    const response = await axios.post(
      `${API_BASE_URL}/salesman/pos/items/scan-barcode`,
      { barcode },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log(`✅ Barcode scan successful`);
    console.log(`   Item: ${response.data.data.item.name}`);
    console.log(`   Batches: ${response.data.data.batches.length}`);
    console.log(`   Total Stock: ${response.data.data.totalAvailableStock}`);
    return response.data.data;
  } catch (error) {
    console.log('❌ Barcode scan failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testCustomerSearch() {
  try {
    console.log('\n👥 Testing customer search...');
    const response = await axios.get(`${API_BASE_URL}/salesman/pos/customers/search`, {
      params: { q: 'a', limit: 5 },
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Customer search successful - Found ${response.data.count} customers`);
    if (response.data.data.length > 0) {
      const customer = response.data.data[0];
      console.log(`   Sample: ${customer.name} (${customer.code})`);
      return customer;
    }
    return null;
  } catch (error) {
    console.log('❌ Customer search failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testWalkInCustomer() {
  try {
    console.log('\n🚶 Testing walk-in customer...');
    const response = await axios.get(`${API_BASE_URL}/salesman/pos/customers/walk-in`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Walk-in customer retrieved`);
    console.log(`   Name: ${response.data.data.name}`);
    console.log(`   Code: ${response.data.data.code}`);
    return response.data.data;
  } catch (error) {
    console.log('❌ Walk-in customer failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testDraftInvoiceCreation(customerId, itemId) {
  try {
    console.log('\n📝 Testing draft invoice creation...');
    const invoiceData = {
      customerId: customerId,
      items: [
        {
          itemId: itemId,
          itemName: 'Test Item',
          quantity: 1,
          unitPrice: 100,
          discount: 0,
          gstRate: 18
        }
      ],
      notes: 'Test POS draft invoice'
    };
    
    const response = await axios.post(
      `${API_BASE_URL}/salesman/pos/invoices/draft`,
      invoiceData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log(`✅ Draft invoice created`);
    console.log(`   Invoice Number: ${response.data.data.invoiceNumber}`);
    console.log(`   Status: ${response.data.data.status}`);
    console.log(`   Total: ${response.data.data.totals.grandTotal}`);
    return response.data.data;
  } catch (error) {
    console.log('❌ Draft invoice creation failed:', error.response?.data?.message || error.message);
    console.log('   Error details:', error.response?.data);
    return null;
  }
}

async function testGetDraftInvoices() {
  try {
    console.log('\n📋 Testing get draft invoices...');
    const response = await axios.get(`${API_BASE_URL}/salesman/pos/invoices/draft`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log(`✅ Draft invoices retrieved - Found ${response.data.count} drafts`);
    return response.data.data;
  } catch (error) {
    console.log('❌ Get draft invoices failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testAuthenticationErrors() {
  try {
    console.log('\n🔒 Testing authentication errors...');
    
    // Test without token
    try {
      await axios.get(`${API_BASE_URL}/salesman/pos/items/search?q=test`);
      console.log('❌ Should have failed without token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected request without token (401)');
      } else {
        console.log(`⚠️  Unexpected status: ${error.response?.status}`);
      }
    }
    
    // Test with invalid token
    try {
      await axios.get(`${API_BASE_URL}/salesman/pos/items/search?q=test`, {
        headers: { Authorization: 'Bearer invalid_token' }
      });
      console.log('❌ Should have failed with invalid token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected invalid token (401)');
      } else {
        console.log(`⚠️  Unexpected status: ${error.response?.status}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Auth error testing failed:', error.message);
  }
}

async function runTests() {
  console.log('🚀 POS Backend API Testing');
  console.log('═'.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log('═'.repeat(60));
  
  // Check if server is running
  try {
    await axios.get(`${API_BASE_URL.replace('/v1', '')}/health`);
    console.log('✅ Backend server is running\n');
  } catch (error) {
    console.log('❌ Backend server is not running!');
    console.log(`   Please start the server: cd Backend && npm start`);
    console.log(`   Expected URL: ${API_BASE_URL}`);
    return;
  }
  
  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed without authentication');
    console.log('   Please check TEST_USER credentials in the script');
    return;
  }
  
  // Test endpoints
  const item = await testItemSearch();
  const customer = await testCustomerSearch();
  const walkInCustomer = await testWalkInCustomer();
  
  // Test barcode scanning if we have an item with barcode
  if (item && item.barcode) {
    await testBarcodeScanning(item.barcode);
  } else {
    console.log('\n⚠️  Skipping barcode test - no items with barcodes found');
  }
  
  // Test invoice creation if we have customer and item
  if (customer && item) {
    await testDraftInvoiceCreation(customer._id, item._id);
    await testGetDraftInvoices();
  } else if (walkInCustomer && item) {
    await testDraftInvoiceCreation(walkInCustomer._id, item._id);
    await testGetDraftInvoices();
  } else {
    console.log('\n⚠️  Skipping invoice tests - no customer or item found');
  }
  
  // Test authentication errors
  await testAuthenticationErrors();
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('✅ POS Backend API Testing Complete!');
  console.log('═'.repeat(60));
  console.log('\n📋 Next Steps:');
  console.log('  1. Review test results above');
  console.log('  2. Test with Postman for detailed inspection');
  console.log('  3. Test confirmed invoice creation (updates stock)');
  console.log('  4. Test FEFO batch selection with multiple batches');
  console.log('  5. Test credit limit validation');
  console.log('  6. Proceed to frontend implementation\n');
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  console.error(error.stack);
});
