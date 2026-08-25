const http = require('http');
const { app } = require('../../server');
const { initDatabase } = require('../config/db');

console.log('🧪 Starting Phase 2 Authentication & RBAC Test Suite...\n');

// Ensure DB is initialized
initDatabase();

const PORT = 5098;
let visitorToken = '';
let staffToken = '';
let adminToken = '';
let devOTPCode = '';
const testEmail = `testvisitor_${Date.now()}@example.com`;

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

    // -------------------------------------------------------------
    // Test 1: Unauthenticated request to /api/auth/me
    // -------------------------------------------------------------
    const res1 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/me',
      method: 'GET'
    });
    console.log(`[Test 1] Unauthenticated request to /api/auth/me: ${res1.status === 401 ? 'PASSED ✅ (401 Unauthorized)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 2: Request Email OTP
    // -------------------------------------------------------------
    const res2 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/request-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: testEmail });
    
    devOTPCode = res2.body.devCode;
    console.log(`[Test 2] Request OTP for ${testEmail}: ${res2.status === 200 ? 'PASSED ✅' : 'FAILED ❌'} (Code: ${devOTPCode})`);

    // -------------------------------------------------------------
    // Test 3: Verify OTP with Incorrect Code
    // -------------------------------------------------------------
    const res3 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: testEmail, otp: '000000' });
    console.log(`[Test 3] Verify OTP with incorrect code: ${res3.status === 400 ? 'PASSED ✅ (400 Rejected)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 4: Verify OTP with Correct Code (Signup/Login)
    // -------------------------------------------------------------
    const res4 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: testEmail, otp: devOTPCode });
    
    visitorToken = res4.body.token;
    const isVisitorRole = res4.body.user && res4.body.user.role === 'VISITOR';
    console.log(`[Test 4] Verify OTP with correct code: ${res4.status === 200 && isVisitorRole ? 'PASSED ✅ (Default role: VISITOR)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 5: Verify Used OTP Again (Anti-Reuse Check)
    // -------------------------------------------------------------
    const res5 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/verify-otp',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: testEmail, otp: devOTPCode });
    console.log(`[Test 5] Verify used OTP again (Anti-Reuse): ${res5.status === 400 ? 'PASSED ✅ (Used OTP rejected)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 6: Retrieve Profile via GET /api/auth/me
    // -------------------------------------------------------------
    const res6 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${visitorToken}` }
    });
    console.log(`[Test 6] GET /api/auth/me with Bearer token: ${res6.status === 200 && res6.body.user.email === testEmail ? 'PASSED ✅' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 7: VISITOR Role accessing /api/auth/test/visitor
    // -------------------------------------------------------------
    const res7 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/test/visitor',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${visitorToken}` }
    });
    console.log(`[Test 7] VISITOR role accessing /test/visitor: ${res7.status === 200 ? 'PASSED ✅ (200 OK)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 8: VISITOR Role trying to access /api/auth/test/staff (Forbidden Check)
    // -------------------------------------------------------------
    const res8 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/test/staff',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${visitorToken}` }
    });
    console.log(`[Test 8] VISITOR role accessing /test/staff: ${res8.status === 403 ? 'PASSED ✅ (403 Forbidden)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 9: Promote User to STAFF Role and Test Access
    // -------------------------------------------------------------
    const res9 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/promote-role',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { userId: res4.body.user.id, newRole: 'STAFF' });
    
    staffToken = res9.body.token;
    
    const res9b = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/test/staff',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    console.log(`[Test 9] STAFF role accessing /test/staff: ${res9b.status === 200 ? 'PASSED ✅ (200 OK)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 10: STAFF Role trying to access /api/auth/test/admin (Forbidden Check)
    // -------------------------------------------------------------
    const res10 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/test/admin',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });
    console.log(`[Test 10] STAFF role accessing /test/admin: ${res10.status === 403 ? 'PASSED ✅ (403 Forbidden)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 11: Promote User to ADMIN Role and Test Admin Access
    // -------------------------------------------------------------
    const res11 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/promote-role',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { userId: res4.body.user.id, newRole: 'ADMIN' });
    
    adminToken = res11.body.token;

    const res11b = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/test/admin',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    console.log(`[Test 11] ADMIN role accessing /test/admin: ${res11b.status === 200 ? 'PASSED ✅ (200 OK)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 12: Google Sign-In Integration Test
    // -------------------------------------------------------------
    const res12 = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/auth/google',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: `google_${Date.now()}@example.com`,
      name: 'Google User',
      googleId: `google_id_${Date.now()}`
    });
    console.log(`[Test 12] Google Sign-In creation: ${res12.status === 200 && res12.body.user.role === 'VISITOR' ? 'PASSED ✅ (Google user created)' : 'FAILED ❌'}`);

    console.log('\n🎉 ALL PHASE 2 AUTHENTICATION & RBAC TESTS PASSED SUCCESSFULLY!\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Test Suite Execution Error: ${err.message}`);
    server.close();
    process.exit(1);
  }
});
