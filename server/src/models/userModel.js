const { getDbInstance } = require('../config/db');

class UserModel {
  static findByEmail(email) {
    const db = getDbInstance();
    return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  }

  static findById(id) {
    const db = getDbInstance();
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  static findByGoogleId(googleId) {
    const db = getDbInstance();
    return db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
  }

  static createVisitor({ name, email, authProvider = 'EMAIL_OTP', googleId = null, avatarUrl = null }) {
    const db = getDbInstance();
    const cleanEmail = email.toLowerCase().trim();
    
    // Ensure default role is strictly VISITOR for public signup
    const stmt = db.prepare(`
      INSERT INTO users (name, email, role, auth_provider, google_id, avatar_url, last_login_at)
      VALUES (?, ?, 'VISITOR', ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const info = stmt.run(name || cleanEmail.split('@')[0], cleanEmail, authProvider, googleId, avatarUrl);
    return this.findById(info.lastInsertRowid);
  }

  static updateLastLogin(userId) {
    const db = getDbInstance();
    db.prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
  }

  static updateRole(userId, newRole) {
    const db = getDbInstance();
    if (!['VISITOR', 'STAFF', 'ADMIN'].includes(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }
    db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newRole, userId);
    return this.findById(userId);
  }

  static linkGoogleAccount(userId, googleId, avatarUrl) {
    const db = getDbInstance();
    db.prepare(`
      UPDATE users 
      SET google_id = ?, 
          avatar_url = COALESCE(avatar_url, ?), 
          auth_provider = CASE WHEN auth_provider = 'EMAIL_OTP' THEN 'BOTH' ELSE auth_provider END,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(googleId, avatarUrl, userId);
    return this.findById(userId);
  }

  // --- OTP Operations ---
  static createOTP({ email, otpCode, purpose = 'LOGIN', ttlMinutes = 10 }) {
    const db = getDbInstance();
    const cleanEmail = email.toLowerCase().trim();
    
    // Invalidate existing unused OTPs for this email
    db.prepare('UPDATE otps SET is_used = 1 WHERE LOWER(email) = LOWER(?) AND is_used = 0').run(cleanEmail);

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO otps (email, otp_code, purpose, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const info = stmt.run(cleanEmail, otpCode, purpose, expiresAt);
    return info.lastInsertRowid;
  }

  static findLatestActiveOTP(email) {
    const db = getDbInstance();
    const cleanEmail = email.toLowerCase().trim();
    return db.prepare(`
      SELECT * FROM otps 
      WHERE LOWER(email) = LOWER(?) 
        AND is_used = 0 
        AND datetime(expires_at) > datetime('now')
      ORDER BY id DESC LIMIT 1
    `).get(cleanEmail);
  }

  static incrementOTPAttempt(otpId) {
    const db = getDbInstance();
    db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE id = ?').run(otpId);
  }

  static markOTPUsed(otpId) {
    const db = getDbInstance();
    db.prepare('UPDATE otps SET is_used = 1 WHERE id = ?').run(otpId);
  }

  static getRecentOTPCount(email, minutes = 10) {
    const db = getDbInstance();
    const cleanEmail = email.toLowerCase().trim();
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM otps 
      WHERE LOWER(email) = LOWER(?) 
        AND datetime(created_at) > datetime('now', '-' || ? || ' minutes')
    `).get(cleanEmail, minutes);
    return result ? result.count : 0;
  }

  // --- Audit Logging ---
  static logAuthEvent({ userId = null, email, eventType, ipAddress = null, userAgent = null }) {
    const db = getDbInstance();
    try {
      db.prepare(`
        INSERT INTO auth_logs (user_id, email, event_type, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, email.toLowerCase().trim(), eventType, ipAddress, userAgent);
    } catch (err) {
      console.error('[AuthLog Error]', err.message);
    }
  }
}

module.exports = UserModel;
