const config = require('../config/env');
const { getDbInstance } = require('../config/db');

class ComplaintAIService {
  constructor() {
    this.apiKey = config.ai.geminiApiKey;
    this.isConfigured = Boolean(this.apiKey && !this.apiKey.includes('placeholder'));
  }

  /**
   * Classifies a visitor complaint using AI + Safety Overrides
   */
  async classifyComplaint({ subject, description, museumId }) {
    const fullText = `${subject} ${description}`.toLowerCase();

    // 1. Safety Rule-Based Hard Overrides (Prevents AI from downgrading electrical/fire/safety hazards)
    if (
      fullText.includes('wire') || fullText.includes('shock') || fullText.includes('fire') ||
      fullText.includes('electric') || fullText.includes('injury') || fullText.includes('hazard') ||
      fullText.includes('danger') || fullText.includes('smoke')
    ) {
      return {
        category: 'SAFETY',
        priority: 'CRITICAL',
        department: 'SECURITY',
        summary: `CRITICAL SAFETY HAZARD REPORTED: ${subject}`,
        confidence: 0.99,
        reasoning: 'Automated Safety Override: Report contains critical visitor safety hazard terms (electrical/fire/injury risk).'
      };
    }

    // 2. Try Gemini LLM Classification if configured
    if (this.isConfigured) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(this.apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `
You are an expert AI Classifier for Government Museum & Zoo Visitor Complaints.
Analyze the following visitor complaint and categorize it accurately into JSON format.

COMPLAINT SUBJECT: "${subject}"
COMPLAINT DESCRIPTION: "${description}"

VALID OPTIONS:
- category: ["CLEANLINESS", "SECURITY", "MAINTENANCE", "STAFF_BEHAVIOR", "TICKETING", "TECHNICAL", "ACCESSIBILITY", "EXHIBIT_ARTIFACT", "FACILITY", "SAFETY", "OTHER"]
- priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
- department: ["ADMINISTRATION", "SECURITY", "MAINTENANCE", "CLEANING", "TECHNICAL", "TICKETING", "CURATORIAL", "ACCESSIBILITY"]

Return ONLY a valid JSON object matching this exact schema:
{
  "category": "MAINTENANCE",
  "priority": "HIGH",
  "department": "MAINTENANCE",
  "summary": "1-sentence concise summary of the issue",
  "confidence": 0.95,
  "reasoning": "Reason for priority and category classification"
}
`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            category: parsed.category || 'OTHER',
            priority: parsed.priority || 'MEDIUM',
            department: parsed.department || 'MAINTENANCE',
            summary: parsed.summary || subject,
            confidence: parsed.confidence || 0.90,
            reasoning: parsed.reasoning || 'AI auto-classification based on complaint description.'
          };
        }
      } catch (err) {
        console.error('[ComplaintAIService Error] Gemini call failed, using Keyword Rule Classifier:', err.message);
      }
    }

    // 3. Fallback Rule-Based Keyword Classifier (Guarantees zero downtime in dev mode)
    return this.ruleBasedClassifier({ subject, description });
  }

  /**
   * Deterministic rule-based keyword classifier fallback
   */
  ruleBasedClassifier({ subject, description }) {
    const text = `${subject} ${description}`.toLowerCase();

    let category = 'OTHER';
    let priority = 'MEDIUM';
    let department = 'ADMINISTRATION';
    let reasoning = 'Categorized via Keyword Analysis System.';

    if (text.includes('clean') || text.includes('dirty') || text.includes('washroom') || text.includes('garbage') || text.includes('trash')) {
      category = 'CLEANLINESS';
      priority = 'MEDIUM';
      department = 'CLEANING';
      reasoning = 'Issue relates to sanitation or hygiene in museum premises.';
    } else if (text.includes('light') || text.includes('broken') || text.includes('damage') || text.includes('door') || text.includes('ac') || text.includes('fan') || text.includes('leak')) {
      category = 'MAINTENANCE';
      priority = 'HIGH';
      department = 'MAINTENANCE';
      reasoning = 'Issue relates to physical infrastructure repair or maintenance.';
    } else if (text.includes('security') || text.includes('guard') || text.includes('theft') || text.includes('lost') || text.includes('fight')) {
      category = 'SECURITY';
      priority = 'HIGH';
      department = 'SECURITY';
      reasoning = 'Issue relates to visitor security or crowd control.';
    } else if (text.includes('staff') || text.includes('rude') || text.includes('behavior') || text.includes('attendant')) {
      category = 'STAFF_BEHAVIOR';
      priority = 'MEDIUM';
      department = 'ADMINISTRATION';
      reasoning = 'Issue relates to staff conduct or visitor service.';
    } else if (text.includes('artifact') || text.includes('display') || text.includes('exhibit') || text.includes('glass')) {
      category = 'EXHIBIT_ARTIFACT';
      priority = 'HIGH';
      department = 'CURATORIAL';
      reasoning = 'Issue relates to museum exhibition displays or historical artifacts.';
    } else if (text.includes('wheelchair') || text.includes('ramp') || text.includes('elevator') || text.includes('access')) {
      category = 'ACCESSIBILITY';
      priority = 'HIGH';
      department = 'ACCESSIBILITY';
      reasoning = 'Issue relates to visitor accessibility for disabled or elderly visitors.';
    }

    return {
      category,
      priority,
      department,
      summary: subject.substring(0, 100),
      confidence: 0.85,
      reasoning
    };
  }

  /**
   * Detects duplicate or similar complaints for the same museum
   */
  detectPotentialDuplicates({ museumId, subject, description, currentComplaintId = null }) {
    const db = getDbInstance();
    const subWords = subject.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    const activeComplaints = db.prepare(`
      SELECT id, complaint_number, subject, description, created_at
      FROM complaints
      WHERE museum_id = ? AND status NOT IN ('CLOSED', 'CANCELLED')
      ORDER BY id DESC LIMIT 20
    `).all(museumId);

    const duplicates = [];

    for (const c of activeComplaints) {
      if (currentComplaintId && c.id === parseInt(currentComplaintId)) continue;

      const otherText = `${c.subject} ${c.description}`.toLowerCase();
      let matchCount = 0;
      subWords.forEach(w => {
        if (otherText.includes(w)) matchCount++;
      });

      if (matchCount >= Math.min(2, subWords.length)) {
        duplicates.push({
          complaintId: c.id,
          complaintNumber: c.complaint_number,
          subject: c.subject,
          createdAt: c.created_at
        });
      }
    }

    return duplicates;
  }
}

module.exports = new ComplaintAIService();
