const express = require('express');
const router = express.Router();
const {
  getTicketTypes,
  createBooking,
  verifyPayment,
  getBookingDetails,
  getUserBookings,
  createTicketType,
  updateTicketType
} = require('../controllers/bookingController');

const { requireAuth, requireRole } = require('../middleware/authMiddleware');

// Public read ticket types for a museum
router.get('/museums/:id/tickets', getTicketTypes);

// Authenticated Visitor Booking Endpoints
router.post('/bookings', requireAuth, createBooking);
router.post('/bookings/:id/verify-payment', requireAuth, verifyPayment);
router.get('/bookings/my-bookings', requireAuth, getUserBookings);
router.get('/bookings/:id', requireAuth, getBookingDetails);

// Admin Ticket Configuration Endpoints
router.post('/ticket-types', requireAuth, requireRole('ADMIN'), createTicketType);
router.put('/ticket-types/:id', requireAuth, requireRole('ADMIN'), updateTicketType);

module.exports = router;
