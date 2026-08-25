const { getDbStatus } = require('../config/db');
const aiService = require('../services/aiService');
const emailService = require('../services/emailService');
const paymentService = require('../services/paymentService');
const qrService = require('../services/qrService');
const { AppError } = require('../middleware/errorHandler');

/**
 * GET /api/health
 * Returns overall server, database, and service boundary health status
 */
function getSystemHealth(req, res) {
  const dbStatus = getDbStatus();
  
  res.status(200).json({
    success: true,
    message: 'AI Museum & Zoo Platform API Operational',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    services: {
      ai: aiService.getStatus(),
      email: emailService.getStatus(),
      payment: paymentService.getStatus(),
      qr: qrService.getStatus()
    }
  });
}

/**
 * GET /api/health/error-test
 * Endpoint to verify centralized error middleware handling
 */
function testErrorHandling(req, res, next) {
  return next(new AppError('Controlled test error for verifying global error middleware.', 400, 'TEST_ERROR'));
}

module.exports = {
  getSystemHealth,
  testErrorHandling
};
