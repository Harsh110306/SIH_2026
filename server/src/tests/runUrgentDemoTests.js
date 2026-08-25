const http = require('http');
const { app } = require('../../server');
const { initDatabase, getDbInstance } = require('../config/db');
const seedDatabase = require('../db/seedData');
const config = require('../config/env');

console.log('========================================================================');
console.log('🧪 RUNNING URGENT FINAL DEMO VERIFICATION TEST SUITE');
console.log('========================================================================\n');

initDatabase();
seedDatabase();

const PORT = 5095;

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
  let passedCount = 0;
  let failedCount = 0;

  const testAssert = (name, condition, details = '') => {
    if (condition) {
      passedCount++;
      console.log(`[PASS ✅] ${name} ${details ? '(' + details + ')' : ''}`);
    } else {
      failedCount++;
      console.error(`[FAIL ❌] ${name} ${details ? '(' + details + ')' : ''}`);
    }
  };

  try {
    console.log(`[Test Suite Server] Running on port ${PORT}\n`);

    // =========================================================================
    // 1. RBAC TESTING LAB VERIFICATION Across Roles
    // =========================================================================
    console.log('--- 1. RBAC ROLE VERIFICATION TESTS ---');
    
    // Logged-out tests
    const unauthVisitor = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/test/visitor', method: 'GET' });
    testAssert('1.1 RBAC Logged-out User -> Protected Visitor endpoint returns 401', unauthVisitor.status === 401);

    // Visitor Authentication
    const reqVisitorOtp = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/request-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'visitor_rbac@museums.gov.in' });
    const verifyVisitor = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/verify-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'visitor_rbac@museums.gov.in', otp: reqVisitorOtp.body.devCode });
    const visitorToken = verifyVisitor.body.token;

    // Staff Authentication (Authorized test promotion header)
    const reqStaffOtp = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/request-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'staff_rbac@museums.gov.in' });
    const verifyStaff = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/verify-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'staff_rbac@museums.gov.in', otp: reqStaffOtp.body.devCode });
    const promoteStaff = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/promote-role', method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': config.jwtSecret } }, { userId: verifyStaff.body.user.id, newRole: 'STAFF' });
    const staffToken = promoteStaff.body.token;

    // Admin Authentication (Authorized test promotion header)
    const reqAdminOtp = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/request-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'admin_rbac@museums.gov.in' });
    const verifyAdmin = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/verify-otp', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { email: 'admin_rbac@museums.gov.in', otp: reqAdminOtp.body.devCode });
    const promoteAdmin = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/promote-role', method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-secret': config.jwtSecret } }, { userId: verifyAdmin.body.user.id, newRole: 'ADMIN' });
    const adminToken = promoteAdmin.body.token;

    // Visitor Role Tests
    const visitorVisRes = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/test/visitor', method: 'GET', headers: { 'Authorization': `Bearer ${visitorToken}` } });
    testAssert('1.2 Visitor User -> GET /api/auth/test/visitor returns 200', visitorVisRes.status === 200);

    const visitorStaffRes = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/test/staff', method: 'GET', headers: { 'Authorization': `Bearer ${visitorToken}` } });
    testAssert('1.3 Visitor User -> GET /api/auth/test/staff returns 403 Forbidden', visitorStaffRes.status === 403);

    const visitorAdminRes = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/test/admin', method: 'GET', headers: { 'Authorization': `Bearer ${visitorToken}` } });
    testAssert('1.4 Visitor User -> GET /api/auth/test/admin returns 403 Forbidden', visitorAdminRes.status === 403);

    // Staff Role Tests
    const staffStaffRes = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/test/staff', method: 'GET', headers: { 'Authorization': `Bearer ${staffToken}` } });
    testAssert('1.5 Staff User -> GET /api/auth/test/staff returns 200', staffStaffRes.status === 200);

    const staffAdminRes = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/test/admin', method: 'GET', headers: { 'Authorization': `Bearer ${staffToken}` } });
    testAssert('1.6 Staff User -> GET /api/auth/test/admin returns 403 Forbidden', staffAdminRes.status === 403);

    // Admin Role Tests
    const adminAdminRes = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/auth/test/admin', method: 'GET', headers: { 'Authorization': `Bearer ${adminToken}` } });
    testAssert('1.7 Admin User -> GET /api/auth/test/admin returns 200', adminAdminRes.status === 200);

    // =========================================================================
    // 2. MULTI-VISITOR BOOKING ENTRY ACCOUNTING TESTS (4-Person Booking Sample)
    // =========================================================================
    console.log('\n--- 2. MULTI-VISITOR BOOKING QR ACCOUNTING TESTS ---');

    // Create a 4-person booking (2 Adult tickets + 2 Child tickets)
    const multiBookingRes = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/bookings', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visitorToken}` }
    }, {
      museumId: 1, visitDate: '2026-10-15', visitorName: 'Multi Visitor Group', visitorEmail: 'visitor_rbac@museums.gov.in',
      totalAmount: 140.0,
      items: [{ ticketTypeId: 1, quantity: 2 }, { ticketTypeId: 2, quantity: 2 }]
    });

    const bookingId = multiBookingRes.body.booking.id;
    const txnId = multiBookingRes.body.paymentOrder.transactionId;

    // Confirm Payment
    await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/bookings/${bookingId}/verify-payment`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${visitorToken}` }
    }, { transactionId: txnId, status: 'SUCCESS' });

    // Retrieve Digital QR Ticket
    const qrRes = await makeRequest({
      hostname: 'localhost', port: PORT, path: `/api/tickets/booking/${bookingId}`, method: 'GET',
      headers: { 'Authorization': `Bearer ${visitorToken}` }
    });

    testAssert('2.1 Multi-Visitor 4-person Digital Ticket Issued', qrRes.status === 200 && qrRes.body.totalAllowed === 4);
    const qrPayload = qrRes.body.qrPayload;

    // SCAN 1 (Visitor 1 / 4)
    const scan1 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/tickets/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
    }, { qrPayload });
    testAssert('2.2 Scan 1 / 4 -> ENTRY ALLOWED (Checked In: 1 / 4, Remaining: 3)', scan1.status === 200 && scan1.body.details.checkedInCount === 1 && scan1.body.details.remainingVisitors === 3);

    // SCAN 2 (Visitor 2 / 4)
    const scan2 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/tickets/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
    }, { qrPayload });
    testAssert('2.3 Scan 2 / 4 -> ENTRY ALLOWED (Checked In: 2 / 4, Remaining: 2)', scan2.status === 200 && scan2.body.details.checkedInCount === 2 && scan2.body.details.remainingVisitors === 2);

    // SCAN 3 (Visitor 3 / 4)
    const scan3 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/tickets/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
    }, { qrPayload });
    testAssert('2.4 Scan 3 / 4 -> ENTRY ALLOWED (Checked In: 3 / 4, Remaining: 1)', scan3.status === 200 && scan3.body.details.checkedInCount === 3 && scan3.body.details.remainingVisitors === 1);

    // SCAN 4 (Visitor 4 / 4 - FINAL)
    const scan4 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/tickets/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
    }, { qrPayload });
    testAssert('2.5 Scan 4 / 4 -> ENTRY ALLOWED (Checked In: 4 / 4, Remaining: 0)', scan4.status === 200 && scan4.body.details.checkedInCount === 4 && scan4.body.details.remainingVisitors === 0);

    // SCAN 5 (Attempt 5th entry on 4-person booking - MUST BE DENIED)
    const scan5 = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/tickets/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
    }, { qrPayload });
    testAssert('2.6 Scan 5 / 4 -> ENTRY DENIED! All visitors already checked in', scan5.status === 409 && scan5.body.code === 'ALREADY_USED' && scan5.body.message.includes('All 4 / 4 visitors'));

    // FORGED QR SIGNATURE ATTACK TEST
    const parsedQr = JSON.parse(qrPayload);
    const forgedSigPayload = JSON.stringify({ t: parsedQr.t, b: parsedQr.b, s: 'fake_tampered_signature_999' });
    const forgedScan = await makeRequest({
      hostname: 'localhost', port: PORT, path: '/api/tickets/validate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${staffToken}` }
    }, { qrPayload: forgedSigPayload });
    testAssert('2.7 HMAC Signature Security: Forged QR signature rejected', forgedScan.status === 400 && forgedScan.body.code === 'INVALID_SIGNATURE');

    // =========================================================================
    // 3. ACTIONABLE AI CHATBOT NAVIGATION TESTS
    // =========================================================================
    console.log('\n--- 3. ACTIONABLE AI CHATBOT NAVIGATION TESTS ---');

    // Booking navigation test
    const chatBooking = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { message: 'How do I book a ticket?' });
    testAssert('3.1 "How do I book a ticket?" -> Returns Actionable Route /museums', chatBooking.status === 200 && chatBooking.body.actionButtons.some(b => b.route === '/museums'));

    // Explore navigation test
    const chatExplore = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { message: 'How can I find a museum?' });
    testAssert('3.2 "How can I find a museum?" -> Returns Actionable Route /museums', chatExplore.status === 200 && chatExplore.body.actionButtons.some(b => b.route === '/museums'));

    // Recommendation navigation test
    const chatRec = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { message: 'Which museum should I visit?' });
    testAssert('3.3 "Which museum should I visit?" -> Returns Actionable Route /recommendations', chatRec.status === 200 && chatRec.body.actionButtons.some(b => b.route === '/recommendations'));

    // My Bookings navigation test
    const chatMyBookings = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { message: 'Where is my ticket?' });
    testAssert('3.4 "Where is my ticket?" -> Returns Actionable Route /my-bookings', chatMyBookings.status === 200 && chatMyBookings.body.actionButtons.some(b => b.route === '/my-bookings'));

    // Report issue navigation test
    const chatComplaint = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { message: 'How do I report a problem?' });
    testAssert('3.5 "How do I report a problem?" -> Returns Actionable Route /submit-complaint', chatComplaint.status === 200 && chatComplaint.body.actionButtons.some(b => b.route === '/submit-complaint'));

    // Gujarati booking navigation test
    const chatGujarati = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { message: 'ટિકિટ કેવી રીતે બુક કરવી?', language: 'gu' });
    testAssert('3.6 Gujarati "ટિકિટ કેવી રીતે બુક કરવી?" -> Returns Actionable Route /museums', chatGujarati.status === 200 && chatGujarati.body.actionButtons.some(b => b.route === '/museums'));

    // Hindi booking navigation test
    const chatHindi = await makeRequest({ hostname: 'localhost', port: PORT, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } }, { message: 'टिकट कैसे बुक करें?', language: 'hi' });
    testAssert('3.7 Hindi "टिकट कैसे बुक करें?" -> Returns Actionable Route /museums', chatHindi.status === 200 && chatHindi.body.actionButtons.some(b => b.route === '/museums'));

    console.log('\n========================================================================');
    console.log(`📊 DEMO VERIFICATION RESULTS`);
    console.log(`Total Assertions Evaluated : ${passedCount + failedCount}`);
    console.log(`Total Passed ✅           : ${passedCount}`);
    console.log(`Total Failed ❌           : ${failedCount}`);
    console.log('========================================================================\n');

    server.close();
    process.exit(failedCount === 0 ? 0 : 1);
  } catch (err) {
    console.error(`❌ Test Execution Error: ${err.message}`);
    server.close();
    process.exit(1);
  }
});
