import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Bot, Send, Sparkles, Languages, RefreshCw, ChevronRight } from 'lucide-react';

export default function ChatPage() {
  const navigate = useNavigate();
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
    "What exhibitions are currently running at Baroda Museum?",
    "આ મ્યુઝિયમ કેટલા વાગ્યે ખુલશે?"
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
          message: 'Welcome to the AI Government Museum & Zoo Assistant! Ask me any questions in English, Hindi, or Gujarati regarding ticket booking, museum recommendations, active exhibitions, ancient artifacts, or reporting issues.',
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
    <main className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1000px' }}>
      {/* Hero Header */}
      <section style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', color: '#10b981', marginBottom: '0.4rem' }}>
          <Sparkles size={20} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em' }}>ACTIONABLE RAG AI ASSISTANT</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.4rem' }}>
          Multilingual Museum & Zoo <span className="gradient-text">Virtual Assistant</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.975rem' }}>
          Ask natural-language questions or workflow guides in English, Hindi (हिंदी), or Gujarati (ગુજરાતી).
        </p>
      </section>

      {/* Main Chat Box Container */}
      <div className="glass-panel" style={{ height: '640px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border-color-glow)' }}>
        {/* Controls Bar */}
        <div style={{ padding: '1rem 1.5rem', background: 'rgba(19, 27, 46, 0.9)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bot color="#10b981" size={24} />
            <div>
              <strong style={{ fontSize: '1rem', color: '#fff' }}>Verified Virtual Assistant</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status: Active (Zero Hallucination + Actionable Guidance)</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Languages size={18} color="var(--accent-cyan)" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            >
              <option value="en">🇬🇧 English</option>
              <option value="hi">🇮🇳 Hindi (हिंदी)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
            </select>
          </div>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === 'USER' ? 'flex-end' : 'flex-start',
                maxWidth: '82%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.sender === 'USER' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                padding: '1rem 1.25rem',
                borderRadius: m.sender === 'USER' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.sender === 'USER' ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)',
                color: '#fff',
                border: m.sender === 'USER' ? 'none' : '1px solid var(--border-color)',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-line'
              }}>
                {m.message}
              </div>

              {/* Render Action Navigation Buttons */}
              {m.actionButtons && m.actionButtons.length > 0 && (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                  {m.actionButtons.map((btn, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigate(btn.route)}
                      className="btn btn-primary"
                      style={{
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span>{btn.label}</span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>{m.timestamp}</span>
                {m.intent && <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>Intent: {m.intent}</span>}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '0.85rem 1.25rem', borderRadius: '14px', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <RefreshCw size={16} className="pulse-ring" /> AI Assistant searching verified database & generating response...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Quick Question Pills */}
        <div style={{ padding: '0.65rem 1.5rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              style={{
                whiteSpace: 'nowrap',
                fontSize: '0.8rem',
                padding: '5px 12px',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                cursor: 'pointer'
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          style={{ padding: '1rem 1.5rem', background: 'rgba(19, 27, 46, 0.95)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}
        >
          <input
            type="text"
            placeholder="Ask a question or workflow guide..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-color)',
              color: '#fff',
              fontSize: '0.95rem'
            }}
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="btn btn-primary"
            style={{ padding: '0.8rem 1.5rem' }}
          >
            <Send size={18} /> Send
          </button>
        </form>
      </div>
    </main>
  );
}
