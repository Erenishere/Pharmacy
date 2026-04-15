// Simple test verification script
const fs = require('fs');
const path = require('path');

const testFiles = [
  'src/app/features/salary/components/salary-package-form/salary-package-form.component.spec.ts',
  'src/app/features/salary/components/salary-package-list/salary-package-list.component.spec.ts',
  'src/app/features/salary/components/target-dashboard/target-dashboard.component.spec.ts'
];

console.log('Verifying test files exist and are readable...\n');

let allFilesValid = true;

testFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').length;
      const describeBlocks = (content.match(/describe\(/g) || []).length;
      const itBlocks = (content.match(/it\(/g) || []).length;
      
      console.log(`✓ ${path.basename(file)}`);
      console.log(`  - Size: ${stats.size} bytes`);
      console.log(`  - Lines: ${lines}`);
      console.log(`  - Test suites (describe): ${describeBlocks}`);
      console.log(`  - Test cases (it): ${itBlocks}`);
      console.log('');
    } else {
      console.log(`✗ ${file} - File not found`);
      allFilesValid = false;
    }
  } catch (error) {
    console.log(`✗ ${file} - Error: ${error.message}`);
    allFilesValid = false;
  }
});

if (allFilesValid) {
  console.log('All test files are valid and ready to run!');
  console.log('\nTo run the tests, use: npm test');
  process.exit(0);
} else {
  console.log('Some test files have issues.');
  process.exit(1);
}
