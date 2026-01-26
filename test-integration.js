/**
 * Integration test script
 * Run this to verify frontend-backend connectivity
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Synthetic Auditor Integration Test');
console.log('=' .repeat(50));

// Check if backend is running
async function checkBackend() {
  try {
    const response = await fetch('http://localhost:8000/api/v1/health');
    const data = await response.json();
    
    console.log('✅ Backend API is running');
    console.log(`   Status: ${data.status}`);
    console.log(`   Ollama: ${data.ollama_available ? '✅ Available' : '❌ Not available'}`);
    console.log(`   GPU: ${data.gpu_available ? '✅ Available' : '❌ Not available'}`);
    console.log(`   Models: ${data.models.join(', ') || 'None'}`);
    
    return true;
  } catch (error) {
    console.log('❌ Backend API is not running');
    console.log('   Please start the backend:');
    console.log('   cd SyntheticAuditor && python cli.py api');
    return false;
  }
}

// Check if frontend is running
async function checkFrontend() {
  try {
    const response = await fetch('http://localhost:5173');
    console.log('✅ Frontend is running on http://localhost:5173');
    return true;
  } catch (error) {
    console.log('❌ Frontend is not running');
    console.log('   Please start the frontend:');
    console.log('   npm run dev');
    return false;
  }
}

// Create test ZIP file
function createTestFiles() {
  const testDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create test JSON file
  const testJson = {
    findings: [
      {
        name: "Test SQL Injection",
        severity: "Critical",
        description: "Test vulnerability",
        cve: "CVE-2024-99999"
      }
    ]
  };
  
  fs.writeFileSync(
    path.join(testDir, 'test-scan.json'),
    JSON.stringify(testJson, null, 2)
  );
  
  console.log('✅ Created test files in test-data/');
}

async function runTests() {
  console.log('\n📋 Running integration tests...');
  console.log('-'.repeat(50));
  
  const backendOk = await checkBackend();
  const frontendOk = await checkFrontend();
  
  if (!backendOk || !frontendOk) {
    console.log('\n❌ Some services are not running.');
    console.log('Please start all services and try again.');
    process.exit(1);
  }
  
  createTestFiles();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ All checks passed!');
  console.log('\nYou can now:');
  console.log('1. Open http://localhost:5173 in your browser');
  console.log('2. Upload test files from test-data/ folder');
  console.log('3. Enter company context');
  console.log('4. Click "Start AI Analysis"');
  console.log('5. Download generated reports');
}

runTests().catch(console.error);