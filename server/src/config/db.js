const path = require('path');
const config = require('./env');

let db = null;
let isConnected = false;

function initDatabase() {
  if (db) return { db, isConnected };

  try {
    const Database = require('better-sqlite3');
    const dbPath = path.resolve(__dirname, '../../', config.dbUrl);
    db = new Database(dbPath, { verbose: null });
    
    // Enable Foreign Keys & Write-Ahead Logging
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    // System Metadata
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT OR REPLACE INTO system_metadata (key, value) 
      VALUES ('version', '1.0.0'), ('phase', 'Phase 8 Complaint Management, AI Auto-Classification & SLA Escalation');
    `);

    // Users Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'VISITOR' CHECK(role IN ('VISITOR', 'STAFF', 'ADMIN')),
        auth_provider TEXT NOT NULL DEFAULT 'EMAIL_OTP' CHECK(auth_provider IN ('EMAIL_OTP', 'GOOGLE', 'BOTH')),
        google_id TEXT UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 1,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME
      );
    `);

    // OTPs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS otps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL, otp_code TEXT NOT NULL,
        purpose TEXT NOT NULL DEFAULT 'LOGIN' CHECK(purpose IN ('LOGIN', 'VERIFY_EMAIL')),
        attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 5,
        is_used INTEGER NOT NULL DEFAULT 0, expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Auth Logs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS auth_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, email TEXT NOT NULL, event_type TEXT NOT NULL,
        ip_address TEXT, user_agent TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // Phase 3 Tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS museums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'MUSEUM' CHECK(type IN ('MUSEUM', 'ZOO', 'HERITAGE_SITE')),
        description TEXT NOT NULL, short_description TEXT, address TEXT NOT NULL, city TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'Gujarat', country TEXT NOT NULL DEFAULT 'India',
        latitude REAL, longitude REAL, contact_email TEXT, contact_phone TEXT, website TEXT,
        opening_time TEXT NOT NULL DEFAULT '09:00', closing_time TEXT NOT NULL DEFAULT '18:00', closed_days TEXT NOT NULL DEFAULT 'Monday',
        entry_fee_adult REAL NOT NULL DEFAULT 50.0, entry_fee_child REAL NOT NULL DEFAULT 20.0, entry_fee_foreigner REAL NOT NULL DEFAULT 200.0,
        facilities TEXT, accessibility_info TEXT, status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
        image_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS galleries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        museum_id INTEGER NOT NULL, name TEXT NOT NULL, description TEXT, floor TEXT, display_order INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
        image_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(museum_id) REFERENCES museums(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS exhibitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        museum_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
        location_gallery TEXT, is_featured INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'ONGOING' CHECK(status IN ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED')),
        image_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(museum_id) REFERENCES museums(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        museum_id INTEGER NOT NULL, gallery_id INTEGER, exhibition_id INTEGER,
        name TEXT NOT NULL, description TEXT NOT NULL, historical_info TEXT, origin TEXT, time_period TEXT,
        category TEXT, material TEXT, dimensions TEXT, creator TEXT, discovery_info TEXT,
        is_public INTEGER DEFAULT 1, status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
        image_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(museum_id) REFERENCES museums(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS zoo_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zoo_id INTEGER NOT NULL, name TEXT NOT NULL, description TEXT, display_order INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
        image_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(zoo_id) REFERENCES museums(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS animals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zoo_id INTEGER NOT NULL, section_id INTEGER,
        common_name TEXT NOT NULL, scientific_name TEXT, description TEXT NOT NULL, species TEXT, family TEXT,
        conservation_status TEXT, native_region TEXT, habitat TEXT, diet TEXT, interesting_facts TEXT,
        is_public INTEGER DEFAULT 1, status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
        image_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(zoo_id) REFERENCES museums(id) ON DELETE CASCADE
      );
    `);

    // Phase 4 Tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY, user_id INTEGER, title TEXT NOT NULL DEFAULT 'Museum Visitor Conversation',
        language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('en', 'hi', 'gu')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL,
        sender TEXT NOT NULL CHECK(sender IN ('USER', 'ASSISTANT', 'SYSTEM')), message TEXT NOT NULL,
        intent TEXT DEFAULT 'INFORMATION', language TEXT DEFAULT 'en', sources TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);

    // Phase 6 & 7 Tables (Updated with Multi-Visitor Entry Accounting)
    db.exec(`
      CREATE TABLE IF NOT EXISTS ticket_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT, museum_id INTEGER NOT NULL, name TEXT NOT NULL, description TEXT, price REAL NOT NULL CHECK(price >= 0),
        currency TEXT NOT NULL DEFAULT 'INR', status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(museum_id) REFERENCES museums(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT, booking_number TEXT UNIQUE NOT NULL, user_id INTEGER NOT NULL, museum_id INTEGER NOT NULL, visit_date DATE NOT NULL,
        total_amount REAL NOT NULL CHECK(total_amount >= 0), currency TEXT NOT NULL DEFAULT 'INR',
        booking_status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK(booking_status IN ('PENDING_PAYMENT', 'PAYMENT_PROCESSING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'REFUNDED')),
        payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED')),
        visitor_name TEXT NOT NULL, visitor_email TEXT NOT NULL, visitor_phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(museum_id) REFERENCES museums(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS booking_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL, ticket_type_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK(quantity > 0), unit_price REAL NOT NULL CHECK(unit_price >= 0), total_price REAL NOT NULL CHECK(total_price >= 0),
        FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE, FOREIGN KEY(ticket_type_id) REFERENCES ticket_types(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL, transaction_id TEXT UNIQUE NOT NULL,
        provider TEXT NOT NULL DEFAULT 'RAZORPAY_SANDBOX', amount REAL NOT NULL CHECK(amount >= 0), currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED')),
        raw_response TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS digital_tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL UNIQUE, qr_code_token TEXT UNIQUE NOT NULL, security_signature TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'USED', 'CANCELLED', 'EXPIRED')),
        checked_in_count INTEGER NOT NULL DEFAULT 0, total_allowed INTEGER NOT NULL DEFAULT 1,
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP, used_at DATETIME, validated_by_staff_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE, FOREIGN KEY(validated_by_staff_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS ticket_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL, staff_id INTEGER NOT NULL, museum_id INTEGER NOT NULL,
        validation_result TEXT NOT NULL CHECK(validation_result IN ('SUCCESS', 'ALREADY_USED', 'INVALID_SIGNATURE', 'WRONG_DATE', 'CANCELLED', 'EXPIRED', 'UNAUTHORIZED')),
        rejection_reason TEXT, validated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(ticket_id) REFERENCES digital_tickets(id) ON DELETE CASCADE, FOREIGN KEY(staff_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(museum_id) REFERENCES museums(id) ON DELETE CASCADE
      );
    `);

    // Migration Check: Add columns checked_in_count & total_allowed if existing digital_tickets table lacks them
    try {
      const ticketCols = db.prepare("PRAGMA table_info(digital_tickets)").all();
      const hasCheckedIn = ticketCols.some(c => c.name === 'checked_in_count');
      const hasTotalAllowed = ticketCols.some(c => c.name === 'total_allowed');

      if (!hasCheckedIn) {
        db.exec("ALTER TABLE digital_tickets ADD COLUMN checked_in_count INTEGER NOT NULL DEFAULT 0;");
      }
      if (!hasTotalAllowed) {
        db.exec("ALTER TABLE digital_tickets ADD COLUMN total_allowed INTEGER NOT NULL DEFAULT 1;");
      }
    } catch (e) {
      console.warn('[Database Migration] digital_tickets column verification:', e.message);
    }

    // ==========================================
    // PHASE 8 TABLES: COMPLAINTS & SLA ESCALATION
    // ==========================================

    db.exec(`
      -- Complaints Master Table
      CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_number TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        museum_id INTEGER NOT NULL,
        gallery_id INTEGER,
        artifact_id INTEGER,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'OTHER' CHECK(category IN ('CLEANLINESS', 'SECURITY', 'MAINTENANCE', 'STAFF_BEHAVIOR', 'TICKETING', 'TECHNICAL', 'ACCESSIBILITY', 'EXHIBIT_ARTIFACT', 'FACILITY', 'SAFETY', 'OTHER')),
        priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_INFORMATION', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED')),
        assigned_department TEXT NOT NULL DEFAULT 'UNASSIGNED' CHECK(assigned_department IN ('UNASSIGNED', 'ADMINISTRATION', 'SECURITY', 'MAINTENANCE', 'CLEANING', 'TECHNICAL', 'TICKETING', 'CURATORIAL', 'ACCESSIBILITY')),
        assigned_staff_id INTEGER,
        sla_deadline DATETIME NOT NULL,
        sla_status TEXT NOT NULL DEFAULT 'WITHIN_SLA' CHECK(sla_status IN ('WITHIN_SLA', 'DUE_SOON', 'BREACHED', 'RESOLVED_WITHIN_SLA', 'RESOLVED_AFTER_SLA')),
        escalation_level INTEGER NOT NULL DEFAULT 1,
        is_duplicate_of_id INTEGER,
        attachment_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        closed_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(museum_id) REFERENCES museums(id) ON DELETE CASCADE,
        FOREIGN KEY(gallery_id) REFERENCES galleries(id) ON DELETE SET NULL,
        FOREIGN KEY(assigned_staff_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY(is_duplicate_of_id) REFERENCES complaints(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_complaints_number ON complaints(complaint_number);
      CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id);
      CREATE INDEX IF NOT EXISTS idx_complaints_museum ON complaints(museum_id);
      CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
      CREATE INDEX IF NOT EXISTS idx_complaints_sla ON complaints(sla_status);
      CREATE INDEX IF NOT EXISTS idx_complaints_dept ON complaints(assigned_department);
    `);

    db.exec(`
      -- AI Classification Metadata Table
      CREATE TABLE IF NOT EXISTS complaint_ai_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL UNIQUE,
        ai_category TEXT NOT NULL,
        ai_priority TEXT NOT NULL,
        ai_department TEXT NOT NULL,
        ai_summary TEXT,
        confidence_score REAL DEFAULT 0.85,
        reasoning TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
      );
    `);

    db.exec(`
      -- Complaint Updates & Activity Timeline Table
      CREATE TABLE IF NOT EXISTS complaint_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        update_type TEXT NOT NULL DEFAULT 'STATUS_CHANGE',
        is_internal INTEGER NOT NULL DEFAULT 0,
        message TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint ON complaint_updates(complaint_id);
    `);

    db.exec(`
      -- Visitor Satisfaction Feedback Table
      CREATE TABLE IF NOT EXISTS complaint_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    db.exec(`
      -- SLA Escalation Log Table
      CREATE TABLE IF NOT EXISTS complaint_escalations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complaint_id INTEGER NOT NULL,
        previous_level INTEGER NOT NULL,
        new_level INTEGER NOT NULL,
        reason TEXT NOT NULL,
        escalated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_complaint_escalations_complaint ON complaint_escalations(complaint_id);
    `);

    isConnected = true;
    console.log(`[Database] SQLite connected successfully at: ${dbPath}`);
  } catch (error) {
    console.error(`[Database Error] Failed to initialize SQLite: ${error.message}`);
    isConnected = false;
  }

  return { db, isConnected };
}

function getDbStatus() {
  if (!db) {
    initDatabase();
  }
  return {
    connected: isConnected,
    type: 'SQLite',
    journalMode: isConnected ? 'WAL' : 'disconnected'
  };
}

module.exports = {
  initDatabase,
  getDbStatus,
  getDbInstance: () => {
    if (!db) initDatabase();
    return db;
  }
};
