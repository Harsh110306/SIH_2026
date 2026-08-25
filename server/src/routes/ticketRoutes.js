const express = require('express');
const router = express.Router();
const { getDigitalTicket, validateTicket, getStaffValidations } = require('../controllers/ticketController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Visitor Digital Ticket Display Route
router.get('/tickets/booking/:bookingId', requireAuth, getDigitalTicket);

// Staff Scanner Validation Endpoints
router.post('/tickets/validate', requireAuth, requireRole('STAFF', 'ADMIN'), validateTicket);
router.get('/staff/validations', requireAuth, requireRole('STAFF', 'ADMIN'), getStaffValidations);

module.exports = router;
