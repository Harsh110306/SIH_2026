const { getDbInstance } = require('../config/db');

class SLAService {
  // Configurable SLA Hours Target per Priority
  static SLA_HOURS = {
    CRITICAL: 2,   // 2 Hours Target
    HIGH: 6,       // 6 Hours Target
    MEDIUM: 24,    // 24 Hours Target
    LOW: 48        // 48 Hours Target
  };

  /**
   * Calculates SLA Deadline Date based on Priority
   */
  static calculateSLADeadline(priority, fromDate = new Date()) {
    const hours = this.SLA_HOURS[priority] || 24;
    const deadline = new Date(fromDate.getTime() + (hours * 60 * 60 * 1000));
    return deadline.toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Automated Background SLA Processor
   * Identifies breached/due complaints, updates SLA status, and triggers level escalations idempotently
   */
  static checkAndProcessSLAEscalations() {
    const db = getDbInstance();
    const now = new Date();
    const nowIso = now.toISOString().replace('T', ' ').substring(0, 19);

    // Fetch active unresolved complaints
    const activeComplaints = db.prepare(`
      SELECT * FROM complaints 
      WHERE status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')
    `).all();

    let breachedCount = 0;
    let dueSoonCount = 0;

    const processTx = db.transaction(() => {
      for (const c of activeComplaints) {
        const deadline = new Date(c.sla_deadline);

        // Case 1: SLA BREACHED (Overdue)
        if (now > deadline) {
          if (c.sla_status !== 'BREACHED') {
            const nextLevel = c.escalation_level + 1;

            // 1. Update Complaint SLA Status & Escalation Level
            db.prepare(`
              UPDATE complaints 
              SET sla_status = 'BREACHED', escalation_level = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(nextLevel, c.id);

            // 2. Log Escalation Event Idempotently
            db.prepare(`
              INSERT INTO complaint_escalations (complaint_id, previous_level, new_level, reason)
              VALUES (?, ?, ?, ?)
            `).run(c.id, c.escalation_level, nextLevel, `SLA Target Breached: Unresolved after ${c.priority} priority SLA deadline.`);

            // 3. Log Activity Timeline Update
            db.prepare(`
              INSERT INTO complaint_updates (complaint_id, user_id, update_type, is_internal, message)
              VALUES (?, 1, 'ESCALATION', 1, ?)
            `).run(c.id, `🚨 AUTOMATED SYSTEM ESCALATION: Complaint breached ${c.priority} SLA deadline. Escalated to Level ${nextLevel} Admin Control.`);

            breachedCount++;
          }
        }
        // Case 2: SLA DUE SOON (Within 2 hours of deadline)
        else if ((deadline.getTime() - now.getTime()) <= (2 * 60 * 60 * 1000)) {
          if (c.sla_status === 'WITHIN_SLA') {
            db.prepare(`
              UPDATE complaints SET sla_status = 'DUE_SOON', updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(c.id);
            dueSoonCount++;
          }
        }
      }
    });

    processTx();

    return {
      checked: activeComplaints.length,
      breached: breachedCount,
      dueSoon: dueSoonCount,
      timestamp: nowIso
    };
  }
}

module.exports = SLAService;
