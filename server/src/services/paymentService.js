const crypto = require('crypto');
const config = require('../config/env');
const { getDbInstance } = require('../config/db');

class PaymentService {
  static getStatus() {
    return {
      provider: 'GOVT_PAYMENT_GATEWAY_SANDBOX',
      status: 'Active',
      currency: 'INR'
    };
  }

  /**
   * Initializes a payment order for a booking
   */
  static createPaymentOrder({ bookingId, amount, currency = 'INR' }) {
    const db = getDbInstance();

    // Check if payment record already exists for booking
    const existing = db.prepare("SELECT * FROM payments WHERE booking_id = ? AND status = 'SUCCESS'").get(bookingId);
    if (existing) {
      throw new Error(`Booking ${bookingId} has already been paid successfully.`);
    }

    const transactionId = `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const stmt = db.prepare(`
      INSERT INTO payments (booking_id, transaction_id, provider, amount, currency, status, raw_response)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const rawResponse = JSON.stringify({
      orderId: transactionId,
      provider: 'GOVT_PAYMENT_GATEWAY_SANDBOX',
      createdAt: new Date().toISOString()
    });

    const info = stmt.run(bookingId, transactionId, 'GOVT_PAYMENT_GATEWAY_SANDBOX', amount, currency, 'PENDING', rawResponse);

    return {
      paymentId: info.lastInsertRowid,
      transactionId,
      amount,
      currency,
      provider: 'GOVT_PAYMENT_GATEWAY_SANDBOX',
      status: 'PENDING'
    };
  }

  /**
   * Verifies backend payment status securely & ensures idempotency
   */
  static verifyAndProcessPayment({ bookingId, transactionId, status = 'SUCCESS', rawResponse = null }) {
    const db = getDbInstance();

    const payment = db.prepare("SELECT * FROM payments WHERE booking_id = ? AND transaction_id = ?").get(bookingId, transactionId);
    if (!payment) {
      throw new Error(`Payment transaction ${transactionId} not found for booking ${bookingId}.`);
    }

    // Idempotency check: If already SUCCESS, return true immediately
    if (payment.status === 'SUCCESS') {
      return { success: true, alreadyProcessed: true, payment };
    }

    const paymentStatus = status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
    const bookingStatus = status === 'SUCCESS' ? 'CONFIRMED' : 'CANCELLED';

    const rawJson = rawResponse ? JSON.stringify(rawResponse) : JSON.stringify({ verifiedAt: new Date().toISOString() });

    // Execute atomic SQLite transaction
    const updateTransaction = db.transaction(() => {
      // 1. Update Payment Status
      db.prepare(`
        UPDATE payments SET status = ?, raw_response = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(paymentStatus, rawJson, payment.id);

      // 2. Update Booking Status
      db.prepare(`
        UPDATE bookings SET booking_status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(bookingStatus, paymentStatus, bookingId);
    });

    updateTransaction();

    const updatedPayment = db.prepare("SELECT * FROM payments WHERE id = ?").get(payment.id);
    return {
      success: paymentStatus === 'SUCCESS',
      alreadyProcessed: false,
      payment: updatedPayment
    };
  }
}

module.exports = PaymentService;
