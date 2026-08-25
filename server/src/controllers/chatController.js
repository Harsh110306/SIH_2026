const ChatModel = require('../models/chatModel');
const aiService = require('../services/aiService');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/chat
 * Handles natural language chatbot interaction
 */
async function processChatMessage(req, res, next) {
  const { message, conversationId, language = 'en' } = req.body;

  if (!message || message.trim().length === 0) {
    return next(new AppError('Message text cannot be empty.', 400, 'EMPTY_MESSAGE'));
  }

  if (message.length > 1000) {
    return next(new AppError('Message exceeds maximum length of 1000 characters.', 400, 'MESSAGE_TOO_LONG'));
  }

  const userId = req.user ? req.user.id : null;
  let activeConvId = conversationId;

  // Find or create conversation
  if (!activeConvId) {
    const newConv = ChatModel.createConversation({
      userId,
      title: message.substring(0, 30) + '...',
      language
    });
    activeConvId = newConv.id;
  } else {
    const conv = ChatModel.getConversationById(activeConvId);
    if (!conv) {
      const newConv = ChatModel.createConversation({ userId, title: message.substring(0, 30), language });
      activeConvId = newConv.id;
    }
  }

  // Save User Message
  ChatModel.addMessage({
    conversationId: activeConvId,
    sender: 'USER',
    message: message.trim(),
    language
  });

  // Retrieve last 10 messages for conversational history context
  const history = ChatModel.getMessagesByConversation(activeConvId, 10);

  // Generate AI Response
  try {
    const aiResult = await aiService.generateChatResponse({
      message: message.trim(),
      history,
      targetLanguage: language
    });

    // Save Assistant Response
    const assistantMsg = ChatModel.addMessage({
      conversationId: activeConvId,
      sender: 'ASSISTANT',
      message: aiResult.text,
      intent: aiResult.intent,
      language: aiResult.language,
      sources: aiResult.sources
    });

    res.status(200).json({
      success: true,
      conversationId: activeConvId,
      message: assistantMsg.message,
      intent: aiResult.intent,
      language: aiResult.language,
      sources: aiResult.sources,
      actionButtons: aiResult.actionButtons || [],
      timestamp: assistantMsg.created_at
    });
  } catch (err) {
    console.error('[ChatController Error]', err);
    return next(new AppError('Failed to process AI chat response. Please try again.', 500, 'AI_SERVICE_ERROR'));
  }
}

/**
 * GET /api/chat/conversations/:id
 */
async function getMessages(req, res, next) {
  const { id } = req.params;
  const conv = ChatModel.getConversationById(id);
  if (!conv) {
    return next(new AppError(`Conversation ${id} not found.`, 404, 'CONVERSATION_NOT_FOUND'));
  }

  const messages = ChatModel.getMessagesByConversation(id);
  res.status(200).json({
    success: true,
    conversation: conv,
    messages
  });
}

/**
 * GET /api/chat/history
 */
async function getUserHistory(req, res) {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    return res.status(200).json({ success: true, conversations: [] });
  }

  const conversations = ChatModel.getUserConversations(userId);
  res.status(200).json({ success: true, conversations });
}

/**
 * DELETE /api/chat/conversations/:id
 */
async function clearConversation(req, res) {
  const { id } = req.params;
  const userId = req.user ? req.user.id : null;
  ChatModel.deleteConversation(id, userId);
  res.status(200).json({ success: true, message: 'Conversation cleared.' });
}

module.exports = {
  processChatMessage,
  getMessages,
  getUserHistory,
  clearConversation
};
