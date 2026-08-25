const http = require('http');
const jwt = require('jsonwebtoken');
const { app } = require('../../server');
const { initDatabase } = require('../config/db');
const config = require('../config/env');
const UserModel = require('../models/userModel');

console.log('========================================================================');
console.log('🛡️ RUNNING REAL BACKEND SECURITY & RBAC AUTHORIZATION TEST SUITE');
console.log('========================================================================\n');

initDatabase();
const PORT = 5098;

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
  let passed = 0;
  let failed = 0;

  function assertCondition(testId, title, isTrue, detail) {
    if (isTrue) {
      passed++;
      console.log(` [PASS ✅] ${testId} ${title} (${detail})`);
    } else {
      failed++;
      console.error(` [FAIL ❌] ${testId} ${title} (${detail})`);
    }
  }

  try {
    // Seed test users in DB directly to ensure authoritative roles exist
    let visitorUser = UserModel.findByEmail('security_visitor_test@museums.gov.in');
    if (!visitorUser) {
      visitorUser = UserModel.createVisitor({ name: 'Security Visitor', email: 'security_visitor_test@museums.gov.in', authProvider: 'EMAIL_OTP' });
    }

    let staffUser = UserModel.findByEmail('security_staff_test@museums.gov.in');
    if (!staffUser) {
      staffUser = UserModel.createVisitor({ name: 'Security Staff', email: 'security_staff_test@museums.gov.in', authProvider: 'EMAIL_OTP' });
      staffUser = UserModel.updateRole(staffUser.id, 'STAFF');
    }

    let adminUser = UserModel.findByEmail('security_admin_test@museums.gov.in');
    if (!adminUser) {
      adminUser = UserModel.createVisitor({ name: 'Security Admin', email: 'security_admin_test@museums.gov.in', authProvider: 'EMAIL_OTP' });
      adminUser = UserModel.updateRole(adminUser.id, 'ADMIN');
    }

    const visitorToken = jwt.sign({ id: visitorUser.id, email: visitorUser.email, role: 'VISITOR' }, config.jwtSecret);
    const staffToken = jwt.sign({ id: staffUser.id, email: staffUser.email, role: 'STAFF' }, config.jwtSecret);
    const adminToken = jwt.sign({ id: adminUser.id, email: adminUser.email, role: 'ADMIN' }, config.jwtSecret);

    // 1. VISITOR attempts STAFF route -> 403 Forbidden
    const res1 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/test/staff', method: 'GET',
      headers: { Authorization: `Bearer ${visitorToken}` }
    });
    assertCondition('Test 1', 'VISITOR attempts STAFF route -> 403', res1.status === 403, `Status ${res1.status}`);

    // 2. VISITOR attempts ADMIN route -> 403 Forbidden
    const res2 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/test/admin', method: 'GET',
      headers: { Authorization: `Bearer ${visitorToken}` }
    });
    assertCondition('Test 2', 'VISITOR attempts ADMIN route -> 403', res2.status === 403, `Status ${res2.status}`);

    // 3. VISITOR attempts promote-role -> 403 Forbidden
    const res3 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/promote-role', method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${visitorToken}` }
    }, { userId: visitorUser.id, newRole: 'ADMIN' });
    assertCondition('Test 3', 'VISITOR attempts promote-role -> 403', res3.status === 403, `Status ${res3.status}`);

    // 4. VISITOR attempts to send role:"ADMIN" in request body -> Blocked (403 or 400)
    const res4 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/test/admin', method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${visitorToken}` }
    });
    assertCondition('Test 4', 'VISITOR attempts to send role:"ADMIN" -> Server blocks with 403', res4.status === 403, `Status ${res4.status}`);

    // 5. VISITOR attempts to send role:"STAFF" in request body -> Blocked (403 or 400)
    const res5 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/test/staff', method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${visitorToken}` }
    });
    assertCondition('Test 5', 'VISITOR attempts to send role:"STAFF" -> Server blocks with 403', res5.status === 403, `Status ${res5.status}`);

    // 6. Modified client/localStorage simulation: Token has valid user id, but client claims role ADMIN -> DB lookup reads VISITOR
    const res6 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/test/admin', method: 'GET',
      headers: { Authorization: `Bearer ${visitorToken}` }
    });
    assertCondition('Test 6', 'Modified client role -> DB lookup enforces VISITOR (403)', res6.status === 403, `Status ${res6.status}`);

    // 7. Forged Client JWT role (signed with fake secret key) -> 401 Invalid Token / Signature Failure
    const forgedToken = jwt.sign({ id: visitorUser.id, email: visitorUser.email, role: 'ADMIN' }, 'fake_hacker_secret_key_123');
    const res7 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/test/admin', method: 'GET',
      headers: { Authorization: `Bearer ${forgedToken}` }
    });
    assertCondition('Test 7', 'Forged Client JWT -> Cryptographic signature check fails (401)', res7.status === 401, `Status ${res7.status}`);

    // 8. STAFF attempts ADMIN route -> 403 Forbidden
    const res8 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/test/admin', method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assertCondition('Test 8', 'STAFF attempts ADMIN route -> 403', res8.status === 403, `Status ${res8.status}`);

    // 9. STAFF attempts promote to ADMIN -> 403 Forbidden
    const res9 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/promote-role', method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` }
    }, { userId: staffUser.id, newRole: 'ADMIN' });
    assertCondition('Test 9', 'STAFF attempts promote-role to ADMIN -> 403', res9.status === 403, `Status ${res9.status}`);

    // 10. ADMIN legitimate admin route -> 200 Allowed
    const res10 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/auth/test/admin', method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assertCondition('Test 10', 'ADMIN accesses protected admin route -> 200 Allowed', res10.status === 200, `Status ${res10.status}`);

    console.log('\n========================================================================');
    console.log(`📊 SECURITY TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

    server.close();
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Security Test Execution Error:', err);
    server.close();
    process.exit(1);
  }
});
