const BookingModel = require('../models/bookingModel');
const PaymentService = require('../services/paymentService');
const emailService = require('../services/emailService');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/museums/:id/tickets
 */
async function getTicketTypes(req, res, next) {
  const { id } = req.params;
  const ticketTypes = BookingModel.getTicketTypesByMuseum(id);
  res.status(200).json({
    success: true,
    museumId: parseInt(id),
    ticketTypes
  });
}

/**
 * POST /api/bookings
 * Create new ticket booking intent
 */
async function createBooking(req, res, next) {
  const { museumId, visitDate, visitorName, visitorEmail, visitorPhone, items } = req.body;
  const userId = req.user.id;

  if (!museumId || !visitDate || !visitorName || !visitorEmail || !items) {
    return next(new AppError('Missing required booking fields (museumId, visitDate, visitorName, visitorEmail, items).', 400, 'INVALID_BOOKING_INPUT'));
  }

  // Validate Visit Date is not in past
  const vDate = new Date(visitDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (vDate < today) {
    return next(new AppError('Visit date cannot be in the past.', 400, 'INVALID_VISIT_DATE'));
  }

  try {
    // 1. Create Booking Record with Backend Price Snapshots
    const booking = BookingModel.createBooking({
      userId,
      museumId: parseInt(museumId),
      visitDate,
      visitorName,
      visitorEmail,
      visitorPhone,
      items
    });

    // 2. Initialize Sandbox Payment Order
    const paymentOrder = PaymentService.createPaymentOrder({
      bookingId: booking.id,
      amount: booking.total_amount,
      currency: booking.currency
    });

    res.status(201).json({
      success: true,
      message: 'Booking initialized. Proceed to payment verification.',
      booking,
      paymentOrder
    });
  } catch (err) {
    return next(new AppError(err.message, 400, 'BOOKING_CREATION_FAILED'));
  }
}

/**
 * POST /api/bookings/:id/verify-payment
 * Verify backend payment status & confirm booking
 */
async function verifyPayment(req, res, next) {
  const { id } = req.params;
  const { transactionId, status = 'SUCCESS', rawResponse } = req.body;

  if (!transactionId) {
    return next(new AppError('Transaction ID is required for payment verification.', 400, 'MISSING_TRANSACTION_ID'));
  }

  const booking = BookingModel.getBookingById(id);
  if (!booking) {
    return next(new AppError(`Booking ID ${id} not found.`, 404, 'BOOKING_NOT_FOUND'));
  }

  // Ownership Check
  if (booking.user_id !== req.user.id && !['STAFF', 'ADMIN'].includes(req.user.role)) {
    return next(new AppError('Forbidden. You do not own this booking.', 403, 'FORBIDDEN_BOOKING_ACCESS'));
  }

  try {
    // Verify & update status atomically
    const paymentResult = PaymentService.verifyAndProcessPayment({
      bookingId: booking.id,
      transactionId,
      status,
      rawResponse
    });

    const updatedBooking = BookingModel.getBookingById(id);

    // Send Email Confirmation if payment success
    if (paymentResult.success && !paymentResult.alreadyProcessed) {
      emailService.sendBookingConfirmationEmail({
        email: updatedBooking.visitor_email,
        name: updatedBooking.visitor_name,
        bookingNumber: updatedBooking.booking_number,
        museumName: updatedBooking.museum?.name || 'Government Museum',
        visitDate: updatedBooking.visit_date,
        totalAmount: updatedBooking.total_amount
      });
    }

    res.status(200).json({
      success: paymentResult.success,
      message: paymentResult.success ? 'Payment verified and booking confirmed successfully!' : 'Payment failed. Booking not confirmed.',
      booking: updatedBooking
    });
  } catch (err) {
    return next(new AppError(err.message, 400, 'PAYMENT_VERIFICATION_FAILED'));
  }
}

/**
 * GET /api/bookings/:id
 */
async function getBookingDetails(req, res, next) {
  const { id } = req.params;
  const booking = BookingModel.getBookingById(id);

  if (!booking) {
    return next(new AppError(`Booking ID ${id} not found.`, 404, 'BOOKING_NOT_FOUND'));
  }

  // Ownership Check
  if (booking.user_id !== req.user.id && !['STAFF', 'ADMIN'].includes(req.user.role)) {
    return next(new AppError('Forbidden. You do not own this booking record.', 403, 'FORBIDDEN_BOOKING_ACCESS'));
  }

  res.status(200).json({
    success: true,
    booking
  });
}

/**
 * GET /api/bookings/my-bookings
 */
async function getUserBookings(req, res) {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  const result = BookingModel.getUserBookings(userId, limit, page);
  res.status(200).json({
    success: true,
    ...result
  });
}

/**
 * POST /api/ticket-types (Admin Only)
 */
async function createTicketType(req, res, next) {
  const { museum_id, name, description, price, currency, status } = req.body;
  if (!museum_id || !name || price === undefined) {
    return next(new AppError('Museum ID, Name, and Price are required for ticket creation.', 400, 'INVALID_TICKET_INPUT'));
  }

  const ticketType = BookingModel.createTicketType({ museum_id, name, description, price, currency, status });
  res.status(201).json({
    success: true,
    message: 'Ticket type created successfully.',
    ticketType
  });
}

/**
 * PUT /api/ticket-types/:id (Admin Only)
 */
async function updateTicketType(req, res, next) {
  const { id } = req.params;
  const ticketType = BookingModel.updateTicketType(id, req.body);
  res.status(200).json({
    success: true,
    message: 'Ticket type updated successfully.',
    ticketType
  });
}

module.exports = {
  getTicketTypes,
  createBooking,
  verifyPayment,
  getBookingDetails,
  getUserBookings,
  createTicketType,
  updateTicketType
};
