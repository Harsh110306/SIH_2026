import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, X, Send, RefreshCw, ChevronRight } from 'lucide-react';
import apiClient from '../api/apiClient';

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [language, setLanguage] = useState('en'); // 'en', 'hi', 'gu'

  const chatEndRef = useRef(null);

  const suggestedQuestions = [
    "How do I book a ticket?",
    "Which museum should I visit?",
    "Where is my ticket?",
    "How do I report a problem?",
    "What are the opening hours of Baroda Museum?"
  ];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ASSISTANT',
          message: 'Hello! I am your AI Virtual Assistant for Government Museums & Zoos. Ask me how to book tickets, find museums, get recommendations, view bookings, or report an issue!',
          intent: 'INFORMATION',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, []);

  const handleSendMessage = async (textToSend = null) => {
    const query = textToSend || inputText;
    if (!query || query.trim().length === 0 || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'USER',
      message: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setLoading(true);

    try {
      const data = await apiClient.post('/chat', {
        message: query.trim(),
        conversationId,
        language
      });

      if (data.success) {
        setConversationId(data.conversationId);
        const assistantMsg = {
          id: Date.now() + 1,
          sender: 'ASSISTANT',
          message: data.message,
          intent: data.intent,
          language: data.language,
          sources: data.sources,
          actionButtons: data.actionButtons || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'ASSISTANT',
        message: err.message || 'I am temporarily unable to process your request. Please try again shortly.',
        intent: 'ERROR',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999,
            padding: '0.9rem 1.4rem',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontWeight: 700,
            fontSize: '0.95rem',
            transition: 'var(--transition-fast)'
          }}
        >
          <Bot size={22} />
          <span>AI Visitor Assistant</span>
        </button>
      )}

      {/* Expandable Glassmorphic Chat Window */}
      {isOpen && (
        <div className="glass-panel" style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          width: 'min(440px, calc(100vw - 32px))',
          height: '620px',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          border: '1px solid var(--border-color-glow)',
          overflow: 'hidden'
        }}>
          {/* Chat Header */}
          <div style={{
            padding: '1rem 1.25rem',
            background: 'rgba(19, 27, 46, 0.95)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Bot size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>Govt Museum & Zoo AI</div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span className="pulse-dot"></span> Actionable Assistant
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  padding: '2px 6px'
                }}
              >
                <option value="en">🇬🇧 English</option>
                <option value="hi">🇮🇳 Hindi</option>
                <option value="gu">ગુજરાતી</option>
              </select>

              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Message Stream */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'USER' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.sender === 'USER' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  padding: '0.85rem 1.1rem',
                  borderRadius: m.sender === 'USER' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.sender === 'USER' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  border: m.sender === 'USER' ? 'none' : '1px solid var(--border-color)',
                  fontSize: '0.925rem',
                  lineHeight: '1.55',
                  whiteSpace: 'pre-line'
                }}>
                  {m.message}
                </div>

                {/* Render Action Navigation Buttons */}
                {m.actionButtons && m.actionButtons.length > 0 && (
                  <div style={{ marginTop: '0.65rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {m.actionButtons.map((btn, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setIsOpen(false);
                          navigate(btn.route);
                        }}
                        className="btn btn-primary"
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem'
                        }}
                      >
                        <span>{btn.label}</span>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <span>{m.timestamp}</span>
                  {m.intent && <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{m.intent}</span>}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.06)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={14} className="pulse-ring" /> AI Assistant is searching verified database...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggested Prompts Pills */}
          <div style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.4rem', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {suggestedQuestions.slice(0, 3).map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: 'var(--accent-cyan)',
                  cursor: 'pointer'
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Footer Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            style={{ padding: '0.85rem 1rem', background: 'rgba(19, 27, 46, 0.95)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.6rem' }}
          >
            <input
              type="text"
              placeholder="Ask a question or workflow guide..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: '0.65rem 0.9rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1rem', borderRadius: '8px' }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
