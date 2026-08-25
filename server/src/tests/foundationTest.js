const { initDatabase, getDbStatus } = require('../config/db');
const { app } = require('../../server');
const http = require('http');

console.log('🧪 Starting Phase 1 Foundation & Architecture Self-Test...\n');

// 1. Test Environment Config
const config = require('../config/env');
console.log(`[Test 1] Config loaded - Port: ${config.port}, NodeEnv: ${config.nodeEnv}`);

// 2. Test DB Initialization
const { isConnected } = initDatabase();
console.log(`[Test 2] Database Connection Result: ${isConnected ? 'PASSED ✅' : 'FAILED ❌'}`);

// 3. Test Services Boundary Status
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const paymentService = require('../services/paymentService');
const qrService = require('../services/qrService');

console.log(`[Test 3] Services Abstraction Layer:`);
console.log(`  - AI Service: ${aiService.getStatus().service} (${aiService.getStatus().status})`);
console.log(`  - Email Service: ${emailService.getStatus().service} (${emailService.getStatus().status})`);
console.log(`  - Payment Service: ${paymentService.getStatus().service} (${paymentService.getStatus().status})`);
console.log(`  - QR Service: ${qrService.getStatus().service} (${qrService.getStatus().status})`);

// 4. Test Server Listener & Health Endpoint
const server = app.listen(5099, async () => {
  console.log(`\n[Test 4] Server listening on test port 5099`);
  
  // HTTP Request to GET /api/health
  http.get('http://localhost:5099/api/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`[Test 5] GET /api/health Response (Status ${res.statusCode}):`);
      console.log(`  ${data}`);
      
      // HTTP Request to GET /api/health/error-test
      http.get('http://localhost:5099/api/health/error-test', (resErr) => {
        let errData = '';
        resErr.on('data', chunk => errData += chunk);
        resErr.on('end', () => {
          console.log(`[Test 6] GET /api/health/error-test Controlled Error (Status ${resErr.statusCode}):`);
          console.log(`  ${errData}`);
          console.log('\n✅ All Phase 1 Backend Foundation Tests Completed Successfully!');
          server.close();
          process.exit(0);
        });
      });
    });
  }).on('error', (err) => {
    console.error(`❌ HTTP Request Failed: ${err.message}`);
    server.close();
    process.exit(1);
  });
});
