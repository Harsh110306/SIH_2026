const express = require('express');
const router = express.Router();
const { processChatMessage, getMessages, getUserHistory, clearConversation } = require('../controllers/chatController');
const { requireAuth } = require('../middleware/authMiddleware');

// Optional Auth Middleware for chat (attaches req.user if token is present)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    const config = require('../config/env');
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, config.jwtSecret);
    } catch (e) {
      // Ignore token errors for guest chat
    }
  }
  next();
}

// Chat API Endpoints
router.post('/chat', optionalAuth, processChatMessage);
router.get('/chat/history', requireAuth, getUserHistory);
router.get('/chat/conversations/:id', optionalAuth, getMessages);
router.delete('/chat/conversations/:id', optionalAuth, clearConversation);

module.exports = router;
