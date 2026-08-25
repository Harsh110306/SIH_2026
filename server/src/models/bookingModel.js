const { getDbInstance } = require('../config/db');
const crypto = require('crypto');

class BookingModel {
  // ==========================================
  // TICKET TYPE OPERATIONS
  // ==========================================

  static getTicketTypesByMuseum(museumId) {
    const db = getDbInstance();
    return db.prepare("SELECT * FROM ticket_types WHERE museum_id = ? AND status = 'ACTIVE' ORDER BY price ASC").all(museumId);
  }

  static getTicketTypeById(id) {
    const db = getDbInstance();
    return db.prepare("SELECT * FROM ticket_types WHERE id = ?").get(id);
  }

  static createTicketType(data) {
    const db = getDbInstance();
    const stmt = db.prepare(`
      INSERT INTO ticket_types (museum_id, name, description, price, currency, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(data.museum_id, data.name, data.description || null, data.price, data.currency || 'INR', data.status || 'ACTIVE');
    return this.getTicketTypeById(info.lastInsertRowid);
  }

  static updateTicketType(id, data) {
    const db = getDbInstance();
    db.prepare(`
      UPDATE ticket_types SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.name, data.description, data.price, data.status, id);
    return this.getTicketTypeById(id);
  }

  // ==========================================
  // BOOKING OPERATIONS
  // ==========================================

  static createBooking({ userId, museumId, visitDate, visitorName, visitorEmail, visitorPhone, items }) {
    const db = getDbInstance();

    // 1. Verify Museum is active
    const museum = db.prepare("SELECT * FROM museums WHERE id = ? AND status = 'ACTIVE'").get(museumId);
    if (!museum) {
      throw new Error(`Museum ${museumId} is not active or available for booking.`);
    }

    // 2. Validate Items & Calculate Total Amount strictly on backend
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Booking must contain at least one valid ticket item.');
    }

    let calculatedTotal = 0;
    const snapshottedItems = [];

    for (const item of items) {
      const ticketType = this.getTicketTypeById(item.ticketTypeId);
      if (!ticketType || ticketType.museum_id !== parseInt(museumId) || ticketType.status !== 'ACTIVE') {
        throw new Error(`Invalid or inactive ticket type ID ${item.ticketTypeId} for museum ${museumId}.`);
      }

      const qty = parseInt(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Invalid quantity ${item.quantity} for ticket type ${ticketType.name}.`);
      }

      const unitPrice = parseFloat(ticketType.price);
      const itemTotal = unitPrice * qty;
      calculatedTotal += itemTotal;

      snapshottedItems.push({
        ticketTypeId: ticketType.id,
        quantity: qty,
        unitPrice,
        totalPrice: itemTotal
      });
    }

    // 3. Generate unique booking number
    const bookingNumber = `MUS-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 4. Atomic Transaction Insertion
    const createTx = db.transaction(() => {
      // Insert Booking
      const bookingStmt = db.prepare(`
        INSERT INTO bookings (
          booking_number, user_id, museum_id, visit_date, total_amount, currency,
          booking_status, payment_status, visitor_name, visitor_email, visitor_phone
        ) VALUES (?, ?, ?, ?, ?, 'INR', 'PENDING_PAYMENT', 'PENDING', ?, ?, ?)
      `);

      const info = bookingStmt.run(
        bookingNumber, userId, museumId, visitDate, calculatedTotal,
        visitorName, visitorEmail, visitorPhone || null
      );
      const bookingId = info.lastInsertRowid;

      // Insert Booking Items
      const itemStmt = db.prepare(`
        INSERT INTO booking_items (booking_id, ticket_type_id, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const sItem of snapshottedItems) {
        itemStmt.run(bookingId, sItem.ticketTypeId, sItem.quantity, sItem.unitPrice, sItem.totalPrice);
      }

      return bookingId;
    });

    const createdBookingId = createTx();
    return this.getBookingById(createdBookingId);
  }

  static getBookingById(id) {
    const db = getDbInstance();
    const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
    if (!booking) return null;

    // Attach Museum details
    booking.museum = db.prepare("SELECT id, name, type, city, address, image_url FROM museums WHERE id = ?").get(booking.museum_id);

    // Attach Booking Items
    booking.items = db.prepare(`
      SELECT bi.*, tt.name as ticket_name, tt.description as ticket_description
      FROM booking_items bi
      JOIN ticket_types tt ON bi.ticket_type_id = tt.id
      WHERE bi.booking_id = ?
    `).all(id);

    // Attach Payment record if available
    booking.payment = db.prepare("SELECT * FROM payments WHERE booking_id = ? ORDER BY id DESC LIMIT 1").get(id);

    return booking;
  }

  static getUserBookings(userId, limit = 20, page = 1) {
    const db = getDbInstance();
    const offset = (page - 1) * limit;

    const countRow = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE user_id = ?").get(userId);
    const total = countRow ? countRow.count : 0;

    const bookings = db.prepare(`
      SELECT b.*, m.name as museum_name, m.city as museum_city, m.type as museum_type, m.image_url as museum_image
      FROM bookings b
      JOIN museums m ON b.museum_id = m.id
      WHERE b.user_id = ?
      ORDER BY b.id DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    return {
      bookings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = BookingModel;
