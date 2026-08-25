const { getDbInstance } = require('../config/db');
const crypto = require('crypto');
const ComplaintAIService = require('../services/complaintAIService');
const SLAService = require('../services/slaService');

class ComplaintModel {
  /**
   * Creates a new visitor complaint with AI Auto-Classification & SLA Setup
   */
  static async createComplaint({ userId, museumId, galleryId, artifactId, subject, description, attachmentUrl = null }) {
    const db = getDbInstance();

    // 1. Execute AI Auto-Classification & Rule-Based Safety Overrides
    const aiResult = await ComplaintAIService.classifyComplaint({ subject, description, museumId });

    // 2. Calculate SLA Deadline
    const slaDeadline = SLAService.calculateSLADeadline(aiResult.priority);

    // 3. Generate Unique Complaint Number
    const complaintNumber = `CMP-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // 4. Atomic Database Transaction Insertion
    const createTx = db.transaction(() => {
      // A. Insert Complaint
      const stmt = db.prepare(`
        INSERT INTO complaints (
          complaint_number, user_id, museum_id, gallery_id, artifact_id, subject, description,
          category, priority, status, assigned_department, sla_deadline, attachment_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CLASSIFIED', ?, ?, ?)
      `);

      const info = stmt.run(
        complaintNumber, userId, museumId, galleryId || null, artifactId || null,
        subject.trim(), description.trim(), aiResult.category, aiResult.priority,
        aiResult.department, slaDeadline, attachmentUrl
      );
      const complaintId = info.lastInsertRowid;

      // B. Insert AI Metadata
      db.prepare(`
        INSERT INTO complaint_ai_metadata (
          complaint_id, ai_category, ai_priority, ai_department, ai_summary, confidence_score, reasoning
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        complaintId, aiResult.category, aiResult.priority, aiResult.department,
        aiResult.summary, aiResult.confidence, aiResult.reasoning
      );

      // C. Insert Initial Activity Log Update
      db.prepare(`
        INSERT INTO complaint_updates (complaint_id, user_id, update_type, is_internal, message, new_status)
        VALUES (?, ?, 'CREATED', 0, ?, 'CLASSIFIED')
      `).run(complaintId, userId, `Complaint created and AI classified as [${aiResult.category}] priority [${aiResult.priority}]. Assigned to [${aiResult.department}] department.`);

      return complaintId;
    });

    const complaintId = createTx();

    // 5. Detect Potential Duplicate Complaints for Staff Review
    const duplicates = ComplaintAIService.detectPotentialDuplicates({ museumId, subject, description, currentComplaintId: complaintId });

    const createdComplaint = this.getComplaintById(complaintId);
    return {
      complaint: createdComplaint,
      potentialDuplicates: duplicates
    };
  }

  static getComplaintById(id) {
    const db = getDbInstance();
    const complaint = db.prepare("SELECT * FROM complaints WHERE id = ?").get(id);
    if (!complaint) return null;

    // Attach Museum details
    complaint.museum = db.prepare("SELECT id, name, city, type FROM museums WHERE id = ?").get(complaint.museum_id);
    
    // Attach AI Metadata
    complaint.aiMetadata = db.prepare("SELECT * FROM complaint_ai_metadata WHERE complaint_id = ?").get(id);

    // Attach Activity Timeline Updates
    complaint.updates = db.prepare(`
      SELECT cu.*, u.name as user_name, u.role as user_role
      FROM complaint_updates cu
      JOIN users u ON cu.user_id = u.id
      WHERE cu.complaint_id = ?
      ORDER BY cu.id ASC
    `).all(id);

    // Attach Feedback if resolved
    complaint.feedback = db.prepare("SELECT * FROM complaint_feedback WHERE complaint_id = ?").get(id);

    // Attach Escalations if any
    complaint.escalations = db.prepare("SELECT * FROM complaint_escalations WHERE complaint_id = ? ORDER BY id ASC").all(id);

    return complaint;
  }

  static getUserComplaints(userId, limit = 20, page = 1) {
    const db = getDbInstance();
    const offset = (page - 1) * limit;

    const countRow = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE user_id = ?").get(userId);
    const total = countRow ? countRow.count : 0;

    const complaints = db.prepare(`
      SELECT c.*, m.name as museum_name, m.city as museum_city
      FROM complaints c
      JOIN museums m ON c.museum_id = m.id
      WHERE c.user_id = ?
      ORDER BY c.id DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    return {
      complaints,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) }
    };
  }

  static getAllComplaints({ page = 1, limit = 20, status = null, priority = null, category = null, department = null, museumId = null, slaStatus = null }) {
    const db = getDbInstance();
    const offset = (page - 1) * limit;

    let baseQuery = 'FROM complaints c JOIN museums m ON c.museum_id = m.id WHERE 1=1';
    const params = [];

    if (status) { baseQuery += ' AND c.status = ?'; params.push(status); }
    if (priority) { baseQuery += ' AND c.priority = ?'; params.push(priority); }
    if (category) { baseQuery += ' AND c.category = ?'; params.push(category); }
    if (department) { baseQuery += ' AND c.assigned_department = ?'; params.push(department); }
    if (museumId) { baseQuery += ' AND c.museum_id = ?'; params.push(museumId); }
    if (slaStatus) { baseQuery += ' AND c.sla_status = ?'; params.push(slaStatus); }

    const countRow = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params);
    const total = countRow ? countRow.count : 0;

    const complaints = db.prepare(`
      SELECT c.*, m.name as museum_name, m.city as museum_city ${baseQuery}
      ORDER BY 
        CASE c.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END ASC,
        c.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    return {
      complaints,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) }
    };
  }

  static updateComplaintStatus(id, { newStatus, userId, message }) {
    const db = getDbInstance();
    const existing = this.getComplaintById(id);
    if (!existing) return null;

    const updateTx = db.transaction(() => {
      let resolvedAt = existing.resolved_at;
      let closedAt = existing.closed_at;

      if (newStatus === 'RESOLVED') resolvedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
      if (newStatus === 'CLOSED') closedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

      db.prepare(`
        UPDATE complaints SET
          status = ?, resolved_at = COALESCE(?, resolved_at), closed_at = COALESCE(?, closed_at), updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStatus, resolvedAt, closedAt, id);

      db.prepare(`
        INSERT INTO complaint_updates (complaint_id, user_id, update_type, is_internal, message, previous_status, new_status)
        VALUES (?, ?, 'STATUS_CHANGE', 0, ?, ?, ?)
      `).run(id, userId, message || `Status updated to ${newStatus}`, existing.status, newStatus);
    });

    updateTx();
    return this.getComplaintById(id);
  }

  static overrideClassification(id, { category, priority, department, staffId, userId, reason }) {
    const db = getDbInstance();
    const existing = this.getComplaintById(id);
    if (!existing) return null;

    const newDeadline = SLAService.calculateSLADeadline(priority || existing.priority);

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE complaints SET
          category = COALESCE(?, category),
          priority = COALESCE(?, priority),
          assigned_department = COALESCE(?, assigned_department),
          assigned_staff_id = COALESCE(?, assigned_staff_id),
          sla_deadline = ?,
          status = 'ASSIGNED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(category, priority, department, staffId, newDeadline, id);

      db.prepare(`
        INSERT INTO complaint_updates (complaint_id, user_id, update_type, is_internal, message)
        VALUES (?, ?, 'OVERRIDE', 1, ?)
      `).run(id, userId, `Admin Manual Override: Category set to [${category}], Priority [${priority}], Dept [${department}]. Reason: ${reason || 'Manual Staff Review'}`);
    });

    updateTx();
    return this.getComplaintById(id);
  }

  static addComment(id, { userId, message, isInternal = 0 }) {
    const db = getDbInstance();
    db.prepare(`
      INSERT INTO complaint_updates (complaint_id, user_id, update_type, is_internal, message)
      VALUES (?, ?, 'COMMENT', ?, ?)
    `).run(id, userId, isInternal ? 1 : 0, message);

    return this.getComplaintById(id);
  }

  static submitFeedback(id, { userId, rating, comment }) {
    const db = getDbInstance();
    db.prepare(`
      INSERT INTO complaint_feedback (complaint_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, rating, comment || null);

    return this.getComplaintById(id);
  }
}

module.exports = ComplaintModel;
