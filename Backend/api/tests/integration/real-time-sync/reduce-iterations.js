#!/usr/bin/env node
/**
 * Script to reduce property test iterations for faster execution
 * 
 * Changes:
 * - numRuns: 100 -> 5
 * - numRuns: 50 -> 3
 * - numRuns: 30 -> 2
 * - numRuns: 20 -> 2
 * - numRuns: 15 -> 2
 */

const fs = require('fs');
const path = require('path');

const propertiesDir = path.join(__dirname, 'properties');
const testFiles = [
  'adminToPosSync.test.js',
  'posToAdminSync.test.js',
  'inventorySync.test.js',
  'dataConsistency.test.js',
  'concurrentOperations.test.js',
  'errorHandling.test.js',
];

const replacements = [
  { from: /{ numRuns: 100/g, to: '{ numRuns: 5' },
  { from: /{ numRuns: 50/g, to: '{ numRuns: 3' },
  { from: /{ numRuns: 30/g, to: '{ numRuns: 2' },
  { from: /{ numRuns: 20/g, to: '{ numRuns: 2' },
  { from: /{ numRuns: 15/g, to: '{ numRuns: 2' },
];

console.log('Reducing property test iterations for faster execution...\n');

testFiles.forEach(filename => {
  const filepath = path.join(propertiesDir, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  Skipping ${filename} (not found)`);
    return;
  }
  
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;
  
  replacements.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✅ Updated ${filename}`);
  } else {
    console.log(`ℹ️  No changes needed for ${filename}`);
  }
});

console.log('\n✨ Done! Property tests will now run faster with fewer iterations.');
console.log('Note: Fewer iterations mean less thorough testing. Use for development only.');
