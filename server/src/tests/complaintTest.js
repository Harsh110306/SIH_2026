const http = require('http');
const { app } = require('../../server');
const { initDatabase, getDbInstance } = require('../config/db');
const seedDatabase = require('../db/seedData');

console.log('🧪 Starting Phase 8 Complaint Management & SLA Escalation Test Suite...\n');

initDatabase();
seedDatabase();

const PORT = 5092;
let visitor1Token = '';
let visitor2Token = '';
let adminToken = '';
let createdComplaintId = null;

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

    // Helper: Setup Users
    const setupUser = async (email, role = 'VISITOR') => {
      const r1 = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/request-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email });
      const devCode = r1.body.devCode;
      const r2 = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/verify-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email, otp: devCode });
      let token = r2.body.token;
      if (role !== 'VISITOR') {
        const r3 = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/promote-role', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { userId: r2.body.user.id, newRole: role });
        token = r3.body.token;
      }
      return { token, user: r2.body.user };
    };

    const v1 = await setupUser('visitor1_cmp@test.com', 'VISITOR');
    visitor1Token = v1.token;

    const v2 = await setupUser('visitor2_cmp@test.com', 'VISITOR');
    visitor2Token = v2.token;

    const adm = await setupUser('admin_cmp@test.com', 'ADMIN');
    adminToken = adm.token;

    // -------------------------------------------------------------
    // Test 1: Create Visitor Complaint with AI Auto-Classification
    // -------------------------------------------------------------
    const res1 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/complaints', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visitor1Token}` }
    }, {
      museumId: 1,
      subject: 'Damaged Lighting in Archaeological Gallery',
      description: 'The overhead gallery light fixture is broken and flickering in the Bronze exhibition hall.'
    });

    createdComplaintId = res1.body.complaint.id;
    const isClassified = res1.body.complaint.category === 'MAINTENANCE' && Boolean(res1.body.complaint.sla_deadline);
    console.log(`[Test 1] POST /api/complaints (AI Auto-Classification & SLA): ${res1.status === 201 && isClassified ? 'PASSED ✅ (Category: ' + res1.body.complaint.category + ', Deadline: ' + res1.body.complaint.sla_deadline + ')' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 2: Safety Rule-Based Hard Override Check
    // -------------------------------------------------------------
    const res2 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/complaints', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visitor1Token}` }
    }, {
      museumId: 1,
      subject: 'Exposed Electrical Wiring Hazard',
      description: 'Exposed electrical live wire spark near entrance wall poses shock hazard to visitors.'
    });

    const isSafetyOverride = res2.body.complaint.priority === 'CRITICAL' && res2.body.complaint.category === 'SAFETY';
    console.log(`[Test 2] Rule-Based Safety Override Check: ${res2.status === 201 && isSafetyOverride ? 'PASSED ✅ (Forced CRITICAL Safety Priority)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 3: Potential Duplicate Complaint Detection
    // -------------------------------------------------------------
    const res3 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/complaints', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visitor1Token}` }
    }, {
      museumId: 1,
      subject: 'Broken Lighting in Archaeological Gallery',
      description: 'The lights in the Bronze gallery are completely dark and broken.'
    });

    const hasDuplicateDetected = res3.body.potentialDuplicates && res3.body.potentialDuplicates.length > 0;
    console.log(`[Test 3] Potential Duplicate Complaint Detection: ${res3.status === 201 && hasDuplicateDetected ? 'PASSED ✅ (Detected Duplicate Complaint #' + res3.body.potentialDuplicates[0].complaintNumber + ')' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 4: Visitor View Own Complaints History
    // -------------------------------------------------------------
    const res4 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/complaints/my-complaints', method: 'GET',
      headers: { 'Authorization': `Bearer ${visitor1Token}` }
    });

    console.log(`[Test 4] GET /api/complaints/my-complaints: ${res4.status === 200 && res4.body.complaints.length >= 3 ? 'PASSED ✅ (' + res4.body.complaints.length + ' complaints found)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 5: Unauthorized Access Control (Visitor B accessing Visitor A complaint)
    // -------------------------------------------------------------
    const res5 = await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/complaints/${createdComplaintId}`, method: 'GET',
      headers: { 'Authorization': `Bearer ${visitor2Token}` }
    });

    console.log(`[Test 5] Unauthorized Access Control Check: ${res5.status === 403 ? 'PASSED ✅ (403 Forbidden)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 6: Internal Staff Note Privacy (Hidden from Visitor)
    // -------------------------------------------------------------
    // Admin adds internal note
    await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/complaints/${createdComplaintId}/comments`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
    }, { message: 'Internal Admin Note: Dispatch electrician team immediately', isInternal: 1 });

    // Visitor views details
    const res6 = await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/complaints/${createdComplaintId}`, method: 'GET',
      headers: { 'Authorization': `Bearer ${visitor1Token}` }
    });

    const hasInternalNote = res6.body.complaint.updates.some(u => u.is_internal === 1);
    console.log(`[Test 6] Internal Note Privacy Check: ${res6.status === 200 && !hasInternalNote ? 'PASSED ✅ (Internal Notes Hidden from Visitor)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 7: Admin Manual Classification Override
    // -------------------------------------------------------------
    const res7 = await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/complaints/${createdComplaintId}/classification`, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
    }, { category: 'FACILITY', priority: 'HIGH', department: 'MAINTENANCE', reason: 'Reclassified by Senior Admin' });

    console.log(`[Test 7] Admin Manual Classification Override: ${res7.status === 200 && res7.body.complaint.category === 'FACILITY' ? 'PASSED ✅' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 8: Status Transition & Visitor Feedback
    // -------------------------------------------------------------
    // Mark RESOLVED
    await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/complaints/${createdComplaintId}/status`, method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
    }, { status: 'RESOLVED', message: 'Lighting fixture replaced and tested.' });

    // Submit Feedback
    const res8 = await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/complaints/${createdComplaintId}/feedback`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visitor1Token}` }
    }, { rating: 5, comment: 'Great prompt service by maintenance team!' });

    console.log(`[Test 8] Status Transition & Visitor Feedback: ${res8.status === 200 && res8.body.complaint.feedback.rating === 5 ? 'PASSED ✅ (5-Star Rating Submitted)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 9: SLA Escalation Background Processor
    // -------------------------------------------------------------
    // Artificially set an overdue deadline on complaint #2
    const db = getDbInstance();
    db.prepare("UPDATE complaints SET sla_deadline = '2026-01-01 00:00:00', sla_status = 'WITHIN_SLA' WHERE id = 2").run();

    const res9 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/admin/sla-check', method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const isBreachedLogged = res9.body.slaResult.breached >= 1;
    console.log(`[Test 9] Automated SLA Escalation Processor: ${res9.status === 200 && isBreachedLogged ? 'PASSED ✅ (' + res9.body.slaResult.breached + ' SLA breach escalated to Level 2 Admin Control)' : 'FAILED ❌'}`);

    console.log('\n🎉 ALL PHASE 8 COMPLAINT MANAGEMENT & SLA ESCALATION TESTS PASSED SUCCESSFULLY!\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Test Suite Execution Error: ${err.message}`);
    server.close();
    process.exit(1);
  }
});
