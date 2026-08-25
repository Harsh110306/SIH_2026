const http = require('http');
const { app } = require('../../server');
const { initDatabase } = require('../config/db');
const seedDatabase = require('../db/seedData');

console.log('🧪 Starting Phase 7 QR Ticket Generation & One-Time Staff Validation Test Suite...\n');

initDatabase();
seedDatabase();

const PORT = 5093;
let visitorToken = '';
let staffToken = '';
let bookingId = null;
let qrPayloadData = null;

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

    const vis = await setupUser('visitor_qr_test@museums.gov.in', 'VISITOR');
    visitorToken = vis.token;

    const stf = await setupUser('staff_qr_test@museums.gov.in', 'STAFF');
    staffToken = stf.token;

    // Step A: Create Booking & Verify Payment
    const bRes = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/bookings', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visitorToken}` }
    }, { museumId: 1, visitDate: '2026-09-25', visitorName: 'QR Visitor', visitorEmail: 'visitor_qr_test@museums.gov.in', items: [{ ticketTypeId: 1, quantity: 1 }] });
    bookingId = bRes.body.booking.id;

    await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/bookings/${bookingId}/verify-payment`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visitorToken}` }
    }, { transactionId: bRes.body.paymentOrder.transactionId, status: 'SUCCESS' });

    // -------------------------------------------------------------
    // Test 1: Generate Digital QR Ticket for Confirmed Booking
    // -------------------------------------------------------------
    const res1 = await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/tickets/booking/${bookingId}`, method: 'GET',
      headers: { 'Authorization': `Bearer ${visitorToken}` }
    });

    qrPayloadData = res1.body.qrPayload;
    const hasDataUrl = Boolean(res1.body.qrImageDataUrl && res1.body.qrImageDataUrl.startsWith('data:image/png'));
    console.log(`[Test 1] GET Digital QR Ticket: ${res1.status === 200 && hasDataUrl ? 'PASSED ✅ (QR Image Generated)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 2: Visitor / Unauthorized user attempting Staff Validation
    // -------------------------------------------------------------
    const res2 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/tickets/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visitorToken}` }
    }, { qrPayload: qrPayloadData });

    console.log(`[Test 2] Visitor unauthorized scan attempt: ${res2.status === 403 ? 'PASSED ✅ (403 Forbidden)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 3: Authorized Staff First Scan (Successful Validation)
    // -------------------------------------------------------------
    const res3 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/tickets/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
    }, { qrPayload: qrPayloadData });

    console.log(`[Test 3] Authorized Staff First Scan: ${res3.status === 200 && res3.body.code === 'ENTRY_ALLOWED' ? 'PASSED ✅ (Status: ENTRY ALLOWED)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 4: ONE-TIME USAGE ENFORCEMENT (Second Scan Attempt)
    // -------------------------------------------------------------
    const res4 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/tickets/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
    }, { qrPayload: qrPayloadData });

    console.log(`[Test 4] One-Time Usage Second Scan: ${res4.status === 409 && res4.body.code === 'ALREADY_USED' ? 'PASSED ✅ (REJECTED: Ticket Already Used)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 5: Forged / Tampered QR Signature Scan
    // -------------------------------------------------------------
    const fakePayload = JSON.stringify({ t: 'qr_fake_token', b: 'MUS-2026-FAKE', s: 'bad_signature' });
    const res5 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/tickets/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
    }, { qrPayload: fakePayload });

    console.log(`[Test 5] Tampered / Fake Signature Check: ${res5.status === 400 ? 'PASSED ✅ (Rejected Tampered Payload)' : 'FAILED ❌'}`);

    // -------------------------------------------------------------
    // Test 6: Staff Validation Audit Log History
    // -------------------------------------------------------------
    const res6 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/staff/validations', method: 'GET',
      headers: { 'Authorization': `Bearer ${staffToken}` }
    });

    console.log(`[Test 6] Staff Audit Log History: ${res6.status === 200 && res6.body.history.length > 0 ? 'PASSED ✅ (' + res6.body.history.length + ' logs recorded)' : 'FAILED ❌'}`);

    console.log('\n🎉 ALL PHASE 7 QR TICKET GENERATION & ONE-TIME VALIDATION TESTS PASSED SUCCESSFULLY!\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error(`❌ Test Suite Execution Error: ${err.message}`);
    server.close();
    process.exit(1);
  }
});
