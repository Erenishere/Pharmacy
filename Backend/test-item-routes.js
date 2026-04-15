/**
 * Quick test script to verify item routes are properly registered
 * Run with: node Backend/test-item-routes.js
 */

const app = require('./src/app');

console.log('\n=== Item Routes Integration Test ===\n');

// Get all registered routes
const routes = [];
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    // Routes registered directly on the app
    routes.push({
      path: middleware.route.path,
      methods: Object.keys(middleware.route.methods).join(', ').toUpperCase(),
    });
  } else if (middleware.name === 'router') {
    // Routes registered via router
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        const path = middleware.regexp.source
          .replace('\\/?', '')
          .replace('(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\^/g, '')
          .replace(/\$/g, '');
        
        routes.push({
          path: path + handler.route.path,
          methods: Object.keys(handler.route.methods).join(', ').toUpperCase(),
        });
      }
    });
  }
});

// Filter and display item-related routes
console.log('✅ Item Routes Found:\n');
const itemRoutes = routes.filter(r => r.path.includes('items') || r.path.includes('inventory'));

if (itemRoutes.length > 0) {
  itemRoutes.forEach(route => {
    console.log(`   ${route.methods.padEnd(10)} ${route.path}`);
  });
  console.log(`\n✅ Total Item Routes: ${itemRoutes.length}`);
} else {
  console.log('❌ No item routes found!');
}

// Check for Swagger documentation endpoint
console.log('\n✅ Documentation Endpoints:\n');
const docsRoutes = routes.filter(r => r.path.includes('docs') || r.path === '/');
docsRoutes.forEach(route => {
  console.log(`   ${route.methods.padEnd(10)} ${route.path}`);
});

console.log('\n=== Test Complete ===\n');
console.log('To view API documentation, start the server and visit:');
console.log('   http://localhost:3000/api/docs\n');
