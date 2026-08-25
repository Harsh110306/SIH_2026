const QRService = require('../services/qrService');
const BookingModel = require('../models/bookingModel');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/tickets/booking/:bookingId
 * Generates/Retrieves digital QR ticket for visitor's confirmed booking
 */
async function getDigitalTicket(req, res, next) {
  const { bookingId } = req.params;

  const booking = BookingModel.getBookingById(bookingId);
  if (!booking) {
    return next(new AppError(`Booking ID ${bookingId} not found.`, 404, 'BOOKING_NOT_FOUND'));
  }

  // Ownership Check
  if (booking.user_id !== req.user.id && !['STAFF', 'ADMIN'].includes(req.user.role)) {
    return next(new AppError('Forbidden. You do not own this ticket.', 403, 'FORBIDDEN_TICKET_ACCESS'));
  }

  try {
    const digitalTicketData = await QRService.getOrCreateDigitalTicket(bookingId);
    res.status(200).json({
      success: true,
      ...digitalTicketData
    });
  } catch (err) {
    return next(new AppError(err.message, 400, 'QR_TICKET_GENERATION_FAILED'));
  }
}

/**
 * POST /api/tickets/validate
 * Staff QR check-in scanner endpoint with One-Time validation enforcement
 */
async function validateTicket(req, res, next) {
  const { qrPayload } = req.body;

  if (!qrPayload) {
    return next(new AppError('QR code payload is required for validation.', 400, 'MISSING_QR_PAYLOAD'));
  }

  try {
    const result = QRService.validateTicketByStaff({
      qrPayloadString: qrPayload,
      staffUser: req.user
    });

    const statusCode = result.success ? 200 : (result.code === 'ALREADY_USED' ? 409 : 400);

    res.status(statusCode).json(result);
  } catch (err) {
    return next(new AppError(err.message, 400, 'TICKET_VALIDATION_FAILED'));
  }
}

/**
 * GET /api/staff/validations
 * Fetch recent validation audit history for logged-in staff
 */
async function getStaffValidations(req, res) {
  const history = QRService.getStaffValidationHistory(req.user.id, 30);
  res.status(200).json({
    success: true,
    history
  });
}

module.exports = {
  getDigitalTicket,
  validateTicket,
  getStaffValidations
};
