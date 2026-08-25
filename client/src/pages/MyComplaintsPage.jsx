import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Shield, Clock, AlertCircle, CheckCircle2, Star, MessageSquare, Plus, ChevronRight, Sparkles } from 'lucide-react';

export default function MyComplaintsPage() {
  const { user, isAuthenticated } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');

  const fetchMyComplaints = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/complaints/my-complaints');
      setComplaints(data.complaints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyComplaints();
    }
  }, [isAuthenticated]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedComplaint) return;

    try {
      const data = await apiClient.post(`/complaints/${selectedComplaint.id}/comments`, {
        message: newComment.trim()
      });
      setSelectedComplaint(data.complaint);
      setNewComment('');
    } catch (err) {
      alert(err.message || 'Failed to add comment');
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      const data = await apiClient.post(`/complaints/${selectedComplaint.id}/feedback`, {
        rating,
        comment: feedbackComment
      });
      setSelectedComplaint(data.complaint);
      alert('Thank you for rating our resolution!');
    } catch (err) {
      alert(err.message || 'Feedback submission failed');
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2>Sign In Required</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Please sign in to view your complaint tracking history.</p>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1000px' }}>
      <section style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-info" style={{ marginBottom: '0.4rem' }}>VISITOR DASHBOARD</span>
          <h1 style={{ fontSize: '2.25rem' }}>My Reported <span className="gradient-text">Complaints</span></h1>
        </div>

        <Link to="/submit-complaint" className="btn btn-primary">
          <Plus size={18} /> File New Complaint
        </Link>
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>Loading complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Shield size={48} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
          <h3>No Complaints Recorded</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You haven't filed any museum issues or complaints.</p>
          <Link to="/submit-complaint" className="btn btn-primary">Report an Issue</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {complaints.map(c => (
            <div key={c.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{c.complaint_number}</span>
                  <span className="badge badge-info">{c.category}</span>
                  <span className={`badge ${c.priority === 'CRITICAL' ? 'badge-error' : 'badge-success'}`} style={{ background: c.priority === 'CRITICAL' ? '#ef4444' : undefined, color: '#fff' }}>
                    {c.priority} PRIORITY
                  </span>
                  <span className={`badge ${c.sla_status === 'BREACHED' ? 'badge-error' : 'badge-success'}`}>
                    SLA: {c.sla_status}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', color: '#fff', marginBottom: '0.3rem' }}>{c.subject}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Location: <strong>{c.museum_name}</strong> • Dept: <strong>{c.assigned_department}</strong> • Status: <strong style={{ color: 'var(--accent-cyan)' }}>{c.status}</strong>
                </div>
              </div>

              <div>
                <button
                  onClick={async () => {
                    const data = await apiClient.get(`/complaints/${c.id}`);
                    setSelectedComplaint(data.complaint);
                  }}
                  className="btn btn-outline"
                  style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                >
                  Track & Details <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complaint Detail & Timeline Modal */}
      {selectedComplaint && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(12px)', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <span className="badge badge-warning">{selectedComplaint.complaint_number}</span>
                <h3 style={{ color: '#fff', fontSize: '1.25rem', marginTop: '4px' }}>{selectedComplaint.subject}</h3>
              </div>
              <button onClick={() => setSelectedComplaint(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* AI Classification Info */}
            {selectedComplaint.aiMetadata && (
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div style={{ color: '#34d399', fontWeight: 700, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Sparkles size={14} /> AI Classification & SLA Tracking
                </div>
                <div>Category: <strong>{selectedComplaint.category}</strong> • Priority: <strong>{selectedComplaint.priority}</strong> • SLA Deadline: <strong>{selectedComplaint.sla_deadline}</strong></div>
              </div>
            )}

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
              {selectedComplaint.description}
            </p>

            {/* Timeline Updates */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ color: '#fff', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Activity Timeline</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {(selectedComplaint.updates || []).map(u => (
                  <div key={u.id} style={{ background: 'rgba(255,255,255,0.04)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-emerald)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      <span>{u.user_name} ({u.user_role})</span>
                      <span>{new Date(u.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ color: '#fff' }}>{u.message}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Add a message update..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={{ flex: 1, padding: '0.65rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}>Send</button>
            </form>

            {/* Feedback Rating Form if Resolved */}
            {['RESOLVED', 'CLOSED'].includes(selectedComplaint.status) && (
              <form onSubmit={handleFeedbackSubmit} style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1rem', borderRadius: '10px', textAlign: 'center' }}>
                <h4 style={{ color: '#f59e0b', fontSize: '0.95rem', marginBottom: '0.5rem' }}>Rate Resolution Satisfaction</h4>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: star <= rating ? '#f59e0b' : 'var(--text-muted)' }}
                    >
                      <Star size={24} fill={star <= rating ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Optional rating feedback comment..."
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem', marginBottom: '0.75rem' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                  Submit 5-Star Rating
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
