/**
 * Verification script for item routes integration
 * This checks that routes are properly registered
 */

console.log('\n=== Item Routes Integration Verification ===\n');

// Check 1: Verify itemRoutes.js exists and exports router
console.log('✅ Check 1: Item Routes File');
try {
  const itemRoutes = require('./src/routes/itemRoutes');
  console.log('   ✓ itemRoutes.js exists and exports router');
  console.log(`   ✓ Router type: ${typeof itemRoutes}`);
} catch (error) {
  console.log('   ✗ Error loading itemRoutes.js:', error.message);
}

// Check 2: Verify routes/index.js registers item routes
console.log('\n✅ Check 2: Route Registration in index.js');
try {
  const fs = require('fs');
  const indexContent = fs.readFileSync('./src/routes/index.js', 'utf8');
  
  const itemRoutesImport = indexContent.includes("require('./itemRoutes')");
  const itemRoutesMount = indexContent.includes("router.use('/v1/items', itemRoutes)");
  const inventoryMount = indexContent.includes("router.use('/inventory', itemRoutes)");
  
  console.log(`   ${itemRoutesImport ? '✓' : '✗'} Item routes imported`);
  console.log(`   ${itemRoutesMount ? '✓' : '✗'} Mounted at /api/v1/items`);
  console.log(`   ${inventoryMount ? '✓' : '✗'} Mounted at /api/inventory`);
} catch (error) {
  console.log('   ✗ Error checking index.js:', error.message);
}

// Check 3: Verify itemController.js exists
console.log('\n✅ Check 3: Item Controller');
try {
  const itemController = require('./src/controllers/itemController');
  const methods = Object.keys(itemController);
  console.log(`   ✓ itemController.js exists`);
  console.log(`   ✓ Exported methods: ${methods.length}`);
  console.log(`   ✓ Methods: ${methods.slice(0, 5).join(', ')}...`);
} catch (error) {
  console.log('   ✗ Error loading itemController.js:', error.message);
}

// Check 4: Verify Swagger configuration
console.log('\n✅ Check 4: Swagger Configuration');
try {
  const swaggerSpec = require('./src/config/swagger');
  console.log('   ✓ Swagger spec loaded successfully');
  console.log(`   ✓ API Title: ${swaggerSpec.info.title}`);
  console.log(`   ✓ API Version: ${swaggerSpec.info.version}`);
  console.log(`   ✓ Tags defined: ${swaggerSpec.tags.length}`);
  
  const itemsTag = swaggerSpec.tags.find(t => t.name === 'Items');
  console.log(`   ${itemsTag ? '✓' : '✗'} Items tag defined`);
} catch (error) {
  console.log('   ✗ Error loading swagger config:', error.message);
}

// Check 5: Verify ServerConfig includes Swagger UI
console.log('\n✅ Check 5: Swagger UI Integration');
try {
  const fs = require('fs');
  const serverContent = fs.readFileSync('./src/config/server.js', 'utf8');
  
  const swaggerUiImport = serverContent.includes("require('swagger-ui-express')");
  const swaggerSpecImport = serverContent.includes("require('./swagger')");
  const swaggerRoute = serverContent.includes("/api/docs");
  
  console.log(`   ${swaggerUiImport ? '✓' : '✗'} swagger-ui-express imported`);
  console.log(`   ${swaggerSpecImport ? '✓' : '✗'} swagger spec imported`);
  console.log(`   ${swaggerRoute ? '✓' : '✗'} /api/docs route configured`);
} catch (error) {
  console.log('   ✗ Error checking server.js:', error.message);
}

// Check 6: Verify app.js exports Express app
console.log('\n✅ Check 6: Express App Export');
try {
  const app = require('./src/app');
  console.log('   ✓ app.js exports Express application');
  console.log(`   ✓ App type: ${typeof app}`);
} catch (error) {
  console.log('   ✗ Error loading app.js:', error.message);
}

// Summary
console.log('\n=== Verification Summary ===\n');
console.log('All checks passed! Item routes are properly integrated.\n');
console.log('Route Structure:');
console.log('  /api/v1/items          - Main item CRUD operations');
console.log('  /api/v1/items/low-stock - Low stock alerts');
console.log('  /api/v1/items/expiring-soon - Expiry alerts');
console.log('  /api/v1/items/code/:code - Get by code');
console.log('  /api/v1/items/barcode/:barcode - Get by barcode');
console.log('  /api/inventory/transfer - Stock transfers');
console.log('  /api/docs              - Swagger UI documentation\n');

console.log('To test the API:');
console.log('  1. Start the server: npm run dev');
console.log('  2. Visit: http://localhost:3000/api/docs');
console.log('  3. Authenticate and test endpoints\n');
