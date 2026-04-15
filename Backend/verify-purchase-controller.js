/**
 * Verification script for Purchase Invoice Controller
 * This script verifies that all required endpoints are implemented
 */

const purchaseInvoiceController = require('./src/controllers/purchaseInvoiceController');
const fs = require('fs');
const path = require('path');

console.log('=== Purchase Invoice Controller Verification ===\n');

// Check controller exports
const requiredFunctions = [
  'createPurchaseInvoice',
  'getAllPurchaseInvoices',
  'getPurchaseInvoiceById',
  'updatePurchaseInvoice',
  'deletePurchaseInvoice',
  'confirmPurchaseInvoice',
  'cancelPurchaseInvoice',
  'createPurchaseReturn',
  'getPurchaseInvoicesBySupplier'
];

console.log('1. Checking Controller Functions:');
let allFunctionsPresent = true;
requiredFunctions.forEach(funcName => {
  const exists = typeof purchaseInvoiceController[funcName] === 'function';
  console.log(`   ${exists ? '✓' : '✗'} ${funcName}`);
  if (!exists) allFunctionsPresent = false;
});

// Check routes file
console.log('\n2. Checking Routes Configuration:');
const routesPath = path.join(__dirname, 'src', 'routes', 'purchaseInvoiceRoutes.js');
const routesContent = fs.readFileSync(routesPath, 'utf8');

const requiredRoutes = [
  { method: 'POST', path: '/', desc: 'Create invoice' },
  { method: 'GET', path: '/', desc: 'List invoices' },
  { method: 'GET', path: '/:id', desc: 'Get by ID' },
  { method: 'PUT', path: '/:id', desc: 'Update draft' },
  { method: 'DELETE', path: '/:id', desc: 'Delete draft' },
  { method: 'PATCH', path: '/:id/confirm', desc: 'Confirm with batch creation' },
  { method: 'PATCH', path: '/:id/cancel', desc: 'Cancel with reversals' },
  { method: 'POST', path: '/return', desc: 'Create return' },
  { method: 'GET', path: '/supplier/:supplierId', desc: 'Supplier invoices' }
];

let allRoutesPresent = true;
requiredRoutes.forEach(route => {
  const method = route.method.toLowerCase();
  const pathPattern = route.path.replace(/\//g, '\\/').replace(/:/g, ':');
  const pattern = new RegExp(`router\\.${method}\\s*\\(`);
  const exists = pattern.test(routesContent) && routesContent.includes(route.path);
  console.log(`   ${exists ? '✓' : '✗'} ${route.method} ${route.path} - ${route.desc}`);
  if (!exists) allRoutesPresent = false;
});

// Check routes registration in main index
console.log('\n3. Checking Routes Registration:');
const indexPath = path.join(__dirname, 'src', 'routes', 'index.js');
const indexContent = fs.readFileSync(indexPath, 'utf8');

const registrations = [
  { path: '/v1/invoices/purchase', desc: 'Primary route' },
  { path: '/v1/purchase-invoices', desc: 'Alternative route for returns' }
];

let allRegistered = true;
registrations.forEach(reg => {
  const exists = indexContent.includes(reg.path);
  console.log(`   ${exists ? '✓' : '✗'} ${reg.path} - ${reg.desc}`);
  if (!exists) allRegistered = false;
});

// Check test file exists
console.log('\n4. Checking Test Coverage:');
const testPath = path.join(__dirname, 'tests', 'integration', 'purchaseInvoice.test.js');
const testExists = fs.existsSync(testPath);
console.log(`   ${testExists ? '✓' : '✗'} Integration tests exist`);

if (testExists) {
  const testContent = fs.readFileSync(testPath, 'utf8');
  const testCount = (testContent.match(/it\(/g) || []).length;
  console.log(`   ✓ ${testCount} test cases found`);
}

// Summary
console.log('\n=== Summary ===');
console.log(`Controller Functions: ${allFunctionsPresent ? '✓ PASS' : '✗ FAIL'}`);
console.log(`Routes Configuration: ${allRoutesPresent ? '✓ PASS' : '✗ FAIL'}`);
console.log(`Routes Registration: ${allRegistered ? '✓ PASS' : '✗ FAIL'}`);
console.log(`Test Coverage: ${testExists ? '✓ PASS' : '✗ FAIL'}`);

const overallPass = allFunctionsPresent && allRoutesPresent && allRegistered && testExists;
console.log(`\nOverall Status: ${overallPass ? '✓ PASS - All requirements met!' : '✗ FAIL - Some requirements missing'}`);

process.exit(overallPass ? 0 : 1);
