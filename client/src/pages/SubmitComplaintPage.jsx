import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle2, Shield, Sparkles, Send, Paperclip, HelpCircle } from 'lucide-react';

export default function SubmitComplaintPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [museums, setMuseums] = useState([]);
  const [selectedMuseum, setSelectedMuseum] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const fetchMuseums = async () => {
      try {
        const data = await apiClient.get('/museums?status=ACTIVE');
        setMuseums(data.items || []);
        if (data.items && data.items.length > 0) {
          setSelectedMuseum(data.items[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMuseums();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMuseum || !subject || !description || submitting) return;

    setSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await apiClient.post('/complaints', {
        museumId: parseInt(selectedMuseum),
        subject: subject.trim(),
        description: description.trim(),
        attachmentUrl: attachmentUrl.trim() || null
      });

      if (res.success) {
        setResult(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2>Sign In Required</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Please sign in to lodge a visitor complaint or report a museum issue.</p>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '720px' }}>
      <section style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', marginBottom: '0.4rem' }}>
          <Sparkles size={18} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>AI-POWERED CLASSIFICATION & SLA ESCALATION</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>
          Report a Museum or Zoo <span className="gradient-text">Issue / Complaint</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Our AI system automatically categorizes your issue, assigns it to the relevant department, and tracks resolution SLA deadlines.
        </p>
      </section>

      {result ? (
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <CheckCircle2 size={36} />
          </div>

          <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>COMPLAINT REGISTERED</span>
          <h2 style={{ fontSize: '1.75rem', color: '#fff', marginBottom: '0.5rem' }}>Complaint #{result.complaint.complaint_number}</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Your issue has been logged and assigned to <strong>{result.complaint.assigned_department}</strong>.
          </p>

          {/* AI Auto-Classification Result Box */}
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '12px', textAlign: 'left', marginBottom: '1.5rem', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={16} /> AI Auto-Classification Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <div>Category: <strong style={{ color: '#fff' }}>{result.complaint.category}</strong></div>
              <div>Priority: <strong style={{ color: result.complaint.priority === 'CRITICAL' ? '#f87171' : '#f59e0b' }}>{result.complaint.priority}</strong></div>
              <div>Assigned Dept: <strong style={{ color: '#fff' }}>{result.complaint.assigned_department}</strong></div>
              <div>SLA Deadline: <strong style={{ color: '#34d399' }}>{result.complaint.sla_deadline}</strong></div>
            </div>
            {result.complaint.aiMetadata && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                💡 <strong>AI Reasoning:</strong> {result.complaint.aiMetadata.reasoning}
              </div>
            )}
          </div>

          {/* Duplicate Notice */}
          {result.potentialDuplicates && result.potentialDuplicates.length > 0 && (
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.85rem', color: '#f59e0b' }}>
              ⚠️ <strong>Note:</strong> Our system detected {result.potentialDuplicates.length} similar active report(s) at this museum. Your complaint has been linked for staff review.
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => navigate('/my-complaints')} className="btn btn-primary" style={{ flex: 1 }}>
              View My Complaints History
            </button>
            <button onClick={() => { setResult(null); setSubject(''); setDescription(''); }} className="btn btn-outline" style={{ flex: 1 }}>
              Submit Another Report
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}>
              {errorMsg}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Select Museum or Zoo Location
            </label>
            <select
              value={selectedMuseum}
              onChange={(e) => setSelectedMuseum(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.95rem' }}
            >
              {museums.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.city})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Complaint Subject / Short Summary
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Broken AC unit in Gaekwad Gallery / Washroom cleanliness issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.95rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Detailed Description of Issue
            </label>
            <textarea
              required
              rows={4}
              placeholder="Please describe the exact location, situation, and details of the problem..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.95rem', lineHeight: '1.6' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Photo / Attachment URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.9rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !subject.trim() || !description.trim()}
            className="btn btn-primary"
            style={{ padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}
          >
            {submitting ? 'Filing Complaint & Classifying with AI...' : 'Submit Complaint & Auto-Classify'} <Send size={18} />
          </button>
        </form>
      )}
    </main>
  );
}
