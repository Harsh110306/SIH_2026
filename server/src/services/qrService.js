const crypto = require('crypto');
const QRCode = require('qrcode');
const config = require('../config/env');
const { getDbInstance } = require('../config/db');

class QRService {
  static getStatus() {
    return {
      engine: 'HMAC-SHA256 Dynamic Security Engine',
      status: 'Active',
      qrGenerator: 'qrcode-npm'
    };
  }

  /**
   * Computes HMAC SHA-256 Dynamic Security Signature
   */
  static computeHMACSignature({ ticketId, bookingNumber, visitDate, token }) {
    const secret = config.jwtSecret || 'dev_secret_key';
    const payload = `${ticketId}:${bookingNumber}:${visitDate}:${token}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Generates or retrieves digital QR ticket for a confirmed booking
   */
  static async getOrCreateDigitalTicket(bookingId) {
    const db = getDbInstance();

    // 1. Verify Booking exists, is confirmed, and payment is success
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
    if (!booking) {
      throw new Error(`Booking ID ${bookingId} not found.`);
    }

    if (booking.booking_status !== 'CONFIRMED' || booking.payment_status !== 'SUCCESS') {
      throw new Error('Digital QR Ticket can only be generated for confirmed paid bookings.');
    }

    // Compute total visitor tickets purchased for this booking
    const qtyRow = db.prepare("SELECT COALESCE(SUM(quantity), 1) as total_allowed FROM booking_items WHERE booking_id = ?").get(bookingId);
    const totalAllowed = qtyRow ? qtyRow.total_allowed : 1;

    // 2. Check if Digital Ticket already exists
    let ticket = db.prepare("SELECT * FROM digital_tickets WHERE booking_id = ?").get(bookingId);

    if (!ticket) {
      const qrToken = `qr_${crypto.randomBytes(12).toString('hex')}`;

      // Insert temporary row to get ID for signature computation
      const stmt = db.prepare(`
        INSERT INTO digital_tickets (booking_id, qr_code_token, security_signature, status, checked_in_count, total_allowed)
        VALUES (?, ?, 'TEMP', 'ACTIVE', 0, ?)
      `);
      const info = stmt.run(bookingId, qrToken, totalAllowed);
      const ticketId = info.lastInsertRowid;

      // Compute HMAC Signature
      const signature = this.computeHMACSignature({
        ticketId,
        bookingNumber: booking.booking_number,
        visitDate: booking.visit_date,
        token: qrToken
      });

      // Update signature
      db.prepare("UPDATE digital_tickets SET security_signature = ? WHERE id = ?").run(signature, ticketId);
      ticket = db.prepare("SELECT * FROM digital_tickets WHERE id = ?").get(ticketId);
    } else if (ticket.total_allowed !== totalAllowed) {
      // Keep total_allowed in sync with booking items
      db.prepare("UPDATE digital_tickets SET total_allowed = ? WHERE id = ?").run(totalAllowed, ticket.id);
      ticket.total_allowed = totalAllowed;
    }

    // 3. Construct Secure QR Payload (Does NOT contain sensitive visitor credentials)
    const qrPayload = JSON.stringify({
      t: ticket.qr_code_token,
      b: booking.booking_number,
      s: ticket.security_signature
    });

    // 4. Generate QR Image Data URL
    const qrImageDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      color: { dark: '#0b0f19', light: '#ffffff' }
    });

    return {
      ticket,
      booking,
      totalAllowed,
      qrPayload,
      qrImageDataUrl
    };
  }

  /**
   * Validates digital ticket for check-in by authorized staff
   * Atomically enforces Multi-Visitor Entry Accounting & HMAC verification
   */
  static validateTicketByStaff({ qrPayloadString, staffUser }) {
    const db = getDbInstance();

    // 1. Staff Role Authorization Check
    if (!staffUser || !['STAFF', 'ADMIN'].includes(staffUser.role)) {
      throw new Error('Unauthorized. Only assigned museum Staff can validate visitor entry tickets.');
    }

    let token = '';
    let signature = '';
    let bookingNumber = '';

    // Parse QR payload
    try {
      if (typeof qrPayloadString === 'object') {
        token = qrPayloadString.t || qrPayloadString.token;
        signature = qrPayloadString.s || qrPayloadString.signature;
        bookingNumber = qrPayloadString.b || qrPayloadString.bookingNumber;
      } else {
        const parsed = JSON.parse(qrPayloadString);
        token = parsed.t || parsed.token;
        signature = parsed.s || parsed.signature;
        bookingNumber = parsed.b || parsed.bookingNumber;
      }
    } catch (e) {
      token = qrPayloadString; // Fallback token
    }

    if (!token) {
      return {
        success: false,
        code: 'INVALID_QR',
        message: 'Invalid QR code payload format.'
      };
    }

    // 2. Fetch Ticket & Booking Records with calculated total allowed visitors
    const ticket = db.prepare(`
      SELECT dt.*, b.booking_number, b.museum_id, b.visit_date, b.booking_status, b.payment_status, b.visitor_name, m.name as museum_name,
             COALESCE((SELECT SUM(quantity) FROM booking_items WHERE booking_id = b.id), dt.total_allowed, 1) as calculated_total_allowed
      FROM digital_tickets dt
      JOIN bookings b ON dt.booking_id = b.id
      JOIN museums m ON b.museum_id = m.id
      WHERE dt.qr_code_token = ?
    `).get(token);

    if (!ticket) {
      return {
        success: false,
        code: 'INVALID_QR',
        message: 'Ticket record not found in system database.'
      };
    }

    const totalAllowed = ticket.calculated_total_allowed || ticket.total_allowed || 1;
    const currentCheckedIn = ticket.checked_in_count || 0;

    // 3. HMAC Security Signature Verification
    const expectedSig = this.computeHMACSignature({
      ticketId: ticket.id,
      bookingNumber: ticket.booking_number,
      visitDate: ticket.visit_date,
      token: ticket.qr_code_token
    });

    if (signature && signature !== expectedSig) {
      db.prepare(`
        INSERT INTO ticket_validations (ticket_id, staff_id, museum_id, validation_result, rejection_reason)
        VALUES (?, ?, ?, 'INVALID_SIGNATURE', 'HMAC Security Signature mismatch or tampered QR payload.')
      `).run(ticket.id, staffUser.id, ticket.museum_id);

      return {
        success: false,
        code: 'INVALID_SIGNATURE',
        message: 'Security Alert! Tampered or forged QR payload signature.'
      };
    }

    // 4. Booking Status & Payment Checks
    if (ticket.booking_status === 'CANCELLED' || ticket.payment_status !== 'SUCCESS') {
      db.prepare(`
        INSERT INTO ticket_validations (ticket_id, staff_id, museum_id, validation_result, rejection_reason)
        VALUES (?, ?, ?, 'CANCELLED', 'Booking is cancelled or payment unconfirmed.')
      `).run(ticket.id, staffUser.id, ticket.museum_id);

      return {
        success: false,
        code: 'CANCELLED',
        message: 'Entry Denied: Booking has been cancelled or refunded.'
      };
    }

    // 5. MULTI-VISITOR CHECK-IN LIMIT CHECK
    if (currentCheckedIn >= totalAllowed || ticket.status === 'USED') {
      db.prepare(`
        INSERT INTO ticket_validations (ticket_id, staff_id, museum_id, validation_result, rejection_reason)
        VALUES (?, ?, ?, 'ALREADY_USED', 'All purchased visitor entries for this booking have already been checked in.')
      `).run(ticket.id, staffUser.id, ticket.museum_id);

      return {
        success: false,
        code: 'ALREADY_USED',
        message: `ENTRY DENIED! All ${totalAllowed} / ${totalAllowed} visitors for this booking have already been checked in.`,
        details: {
          ticketId: ticket.id,
          bookingNumber: ticket.booking_number,
          visitorName: ticket.visitor_name,
          museumName: ticket.museum_name,
          visitDate: ticket.visit_date,
          checkedInCount: totalAllowed,
          totalAllowed: totalAllowed,
          remainingVisitors: 0,
          usedAt: ticket.used_at
        }
      };
    }

    // 6. ATOMIC TRANSACTION MULTI-VISITOR SCAN LOCK
    const updateTx = db.transaction(() => {
      const info = db.prepare(`
        UPDATE digital_tickets
        SET checked_in_count = checked_in_count + 1,
            status = CASE WHEN checked_in_count + 1 >= ? THEN 'USED' ELSE 'ACTIVE' END,
            used_at = CASE WHEN checked_in_count + 1 >= ? THEN CURRENT_TIMESTAMP ELSE used_at END,
            validated_by_staff_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND checked_in_count < ?
      `).run(totalAllowed, totalAllowed, staffUser.id, ticket.id, totalAllowed);

      if (info.changes === 0) {
        return false;
      }

      // Log successful validation entry
      db.prepare(`
        INSERT INTO ticket_validations (ticket_id, staff_id, museum_id, validation_result)
        VALUES (?, ?, ?, 'SUCCESS')
      `).run(ticket.id, staffUser.id, ticket.museum_id);

      return true;
    });

    const isSuccess = updateTx();
    if (!isSuccess) {
      return {
        success: false,
        code: 'ALREADY_USED',
        message: `ENTRY DENIED! All ${totalAllowed} / ${totalAllowed} visitors for this booking have already been checked in.`
      };
    }

    const newCheckedInCount = currentCheckedIn + 1;
    const remainingVisitors = totalAllowed - newCheckedInCount;

    // Return Success Response with Visitor Accounting
    return {
      success: true,
      code: 'ENTRY_ALLOWED',
      message: `✓ VALID TICKET - ENTRY ALLOWED (${newCheckedInCount} / ${totalAllowed} Visitors Checked In)`,
      details: {
        ticketId: ticket.id,
        bookingNumber: ticket.booking_number,
        visitorName: ticket.visitor_name,
        museumName: ticket.museum_name,
        visitDate: ticket.visit_date,
        checkedInCount: newCheckedInCount,
        totalAllowed: totalAllowed,
        remainingVisitors: remainingVisitors,
        validatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Retrieves recent validation history for staff dashboard
   */
  static getStaffValidationHistory(staffId, limit = 20) {
    const db = getDbInstance();
    return db.prepare(`
      SELECT tv.*, dt.qr_code_token, b.booking_number, b.visitor_name, m.name as museum_name
      FROM ticket_validations tv
      JOIN digital_tickets dt ON tv.ticket_id = dt.id
      JOIN bookings b ON dt.booking_id = b.id
      JOIN museums m ON tv.museum_id = m.id
      WHERE tv.staff_id = ?
      ORDER BY tv.id DESC
      LIMIT ?
    `).all(staffId, limit);
  }
}

module.exports = QRService;
