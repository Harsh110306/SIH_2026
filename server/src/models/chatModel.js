const { getDbInstance } = require('../config/db');
const crypto = require('crypto');

class ChatModel {
  static createConversation({ userId = null, title = 'Museum Assistant Chat', language = 'en' }) {
    const db = getDbInstance();
    const id = `conv_${crypto.randomBytes(8).toString('hex')}`;
    
    db.prepare(`
      INSERT INTO conversations (id, user_id, title, language)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, title, language);

    return this.getConversationById(id);
  }

  static getConversationById(id) {
    const db = getDbInstance();
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  }

  static getUserConversations(userId, limit = 20) {
    const db = getDbInstance();
    return db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?').all(userId, limit);
  }

  static addMessage({ conversationId, sender, message, intent = 'INFORMATION', language = 'en', sources = null }) {
    const db = getDbInstance();
    
    // Update conversation timestamp
    db.prepare("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(conversationId);

    const stmt = db.prepare(`
      INSERT INTO chat_messages (conversation_id, sender, message, intent, language, sources)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const sourcesJson = sources ? JSON.stringify(sources) : null;
    const info = stmt.run(conversationId, sender, message, intent, language, sourcesJson);

    return db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(info.lastInsertRowid);
  }

  static getMessagesByConversation(conversationId, limit = 50) {
    const db = getDbInstance();
    const rows = db.prepare(`
      SELECT * FROM chat_messages 
      WHERE conversation_id = ? 
      ORDER BY id ASC LIMIT ?
    `).all(conversationId, limit);

    return rows.map(r => ({
      ...r,
      sources: r.sources ? JSON.parse(r.sources) : null
    }));
  }

  static deleteConversation(id, userId = null) {
    const db = getDbInstance();
    if (userId) {
      db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(id, userId);
    } else {
      db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
    }
    return true;
  }
}

module.exports = ChatModel;
