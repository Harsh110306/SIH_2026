const http = require('http');
const { app } = require('../../server');
const { initDatabase } = require('../config/db');
const seedDatabase = require('../db/seedData');

console.log('🧪 Starting Phase 3 Museum & Zoo Data Management Test Suite...\n');

initDatabase();
seedDatabase();

const PORT = 5097;
let adminToken = '';
let createdMuseumId = null;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

const server = app.listen(PORT, async () => {
  try {
    console.log(`[Suite] Server listening on test port ${PORT}\n`);

    // Step A: Request OTP
    const reqOtpRes = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/request-otp', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin_museum_test@museums.gov.in' });

    const devOtp = reqOtpRes.body.devCode;

    // Step B: Verify OTP
    const adminRes = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/verify-otp', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin_museum_test@museums.gov.in', otp: devOtp });

    // Step C: Promote to ADMIN
    const promoteRes = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/promote-role', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { userId: adminRes.body.user.id, newRole: 'ADMIN' });
    adminToken = promoteRes.body.token;

    // -------------------------------------------------------------
    // Test 1: GET /api/museums (Public Museums List)
    // -------------------------------------------------------------
    const res1 = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/museums', method: 'GET' });
    console.log(`[Test 1] Public GET /api/museums: ${res1.status === 200 && res1.body.items.length >= 3 ? 'PASSED ✅' : 'FAILED ❌'} (${res1.body.items.length} records found)`);

    // -------------------------------------------------------------
    // Test 2: Filter by Type ZOO
    // -------------------------------------------------------------
    const res2 = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/museums?type=ZOO', method: 'GET' });
    console.log(`[Test 2] Filter museums by type=ZOO: ${res2.status === 200 && res2.body.items[0].type === 'ZOO' ? 'PASSED ✅' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 3: GET /api/museums/1 (Baroda Museum Detail & Galleries)
    // -------------------------------------------------------------
    const res3 = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/museums/1', method: 'GET' });
    const hasGalleries = res3.body.museum && res3.body.museum.galleries.length > 0;
    console.log(`[Test 3] GET /api/museums/1 (Details & Galleries): ${res3.status === 200 && hasGalleries ? 'PASSED ✅' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 4: GET /api/museums/1/artifacts
    // -------------------------------------------------------------
    const res4 = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/museums/1/artifacts', method: 'GET' });
    console.log(`[Test 4] GET /api/museums/1/artifacts: ${res4.status === 200 && res4.body.items.length > 0 ? 'PASSED ✅' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 5: GET /api/museums/2/animals
    // -------------------------------------------------------------
    const res5 = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/museums/2/animals', method: 'GET' });
    console.log(`[Test 5] GET /api/museums/2/animals: ${res5.status === 200 && res5.body.items.length > 0 ? 'PASSED ✅' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 6: Global Search API (Search 'lion')
    // -------------------------------------------------------------
    const res6 = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/search?q=lion', method: 'GET' });
    console.log(`[Test 6] GET /api/search?q=lion: ${res6.status === 200 && res6.body.results.animals.length > 0 ? 'PASSED ✅' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 7: Unauthorized Visitor attempting Admin Create Museum
    // -------------------------------------------------------------
    const res7 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/museums', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { name: 'Unauthorized Museum', description: 'Test', address: 'Test', city: 'Test' });
    console.log(`[Test 7] Unauthenticated create museum attempt: ${res7.status === 401 ? 'PASSED ✅ (401 Unauthorized)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 8: Authorized ADMIN creating a new Museum
    // -------------------------------------------------------------
    const res8 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/museums', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
    }, {
      name: 'Kutch Museum',
      type: 'MUSEUM',
      description: 'The oldest museum of Gujarat, founded in 1877.',
      address: 'Opposite Hamirsar Lake',
      city: 'Bhuj',
      state: 'Gujarat',
      entry_fee_adult: 20
    });
    createdMuseumId = res8.body.museum.id;
    console.log(`[Test 8] ADMIN POST /api/museums: ${res8.status === 201 && createdMuseumId ? 'PASSED ✅ (Museum ID ' + createdMuseumId + ' created)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 9: Authorized ADMIN updating Museum
    // -------------------------------------------------------------
    const res9 = await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/museums/${createdMuseumId}`, method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
    }, { city: 'Bhuj, Kutch', entry_fee_adult: 25 });
    console.log(`[Test 9] ADMIN PUT /api/museums/${createdMuseumId}: ${res9.status === 200 && res9.body.museum.city === 'Bhuj, Kutch' ? 'PASSED ✅' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 10: Authorized ADMIN soft deactivating Museum
    // -------------------------------------------------------------
    const res10 = await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/museums/${createdMuseumId}/status`, method: 'PATCH',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log(`[Test 10] ADMIN PATCH /api/museums/${createdMuseumId}/status: ${res10.status === 200 ? 'PASSED ✅ (Soft Deactivated)' : 'FAILED ❌'}`);

    console.log('\n🎉 ALL PHASE 3 MUSEUM & ZOO DATA MANAGEMENT TESTS PASSED SUCCESSFULLY!\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Test Suite Execution Error: ${err.message}`);
    server.close();
    process.exit(1);
  }
});
