import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertCircle, CheckCircle2, RefreshCw, Filter, Sparkles, User, Clock, Layers } from 'lucide-react';

export default function AdminComplaintsPage() {
  const { user, role, switchUserRole } = useAuth();
  const isAuthorized = ['STAFF', 'ADMIN'].includes(role);

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [overrideData, setOverrideData] = useState({
    category: 'MAINTENANCE',
    priority: 'HIGH',
    department: 'MAINTENANCE',
    reason: ''
  });

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      let query = '/complaints?limit=50';
      if (filterPriority) query += `&priority=${filterPriority}`;
      if (filterStatus) query += `&status=${filterStatus}`;

      const data = await apiClient.get(query);
      setComplaints(data.complaints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchComplaints();
    }
  }, [isAuthorized, filterPriority, filterStatus]);

  const handleTriggerSLA = async () => {
    try {
      const data = await apiClient.post('/admin/sla-check');
      alert(`SLA Processor Executed: Checked ${data.slaResult.checked} active complaints, ${data.slaResult.breached} SLA breaches escalated.`);
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'SLA Processor execution failed.');
    }
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      await apiClient.patch(`/complaints/${selectedComplaint.id}/classification`, overrideData);
      alert('Manual classification override applied successfully!');
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'Override failed');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await apiClient.patch(`/complaints/${id}/status`, { status: newStatus, message: `Staff changed status to ${newStatus}` });
      fetchComplaints();
    } catch (err) {
      alert(err.message || 'Status update failed');
    }
  };

  if (!isAuthorized) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '560px', margin: '0 auto', padding: '3rem 2rem', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
          <Shield size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Staff Authorization Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Only assigned Staff & Admin users can access the complaint management portal.
          </p>
          <button onClick={() => switchUserRole('ADMIN')} className="btn btn-primary">
            Switch to ADMIN Role for Testing
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Header */}
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-warning" style={{ marginBottom: '0.4rem' }}>ADMIN & STAFF CONTROL</span>
          <h1 style={{ fontSize: '2.25rem' }}>Complaint Management <span className="gradient-text">& SLA Portal</span></h1>
        </div>

        {role === 'ADMIN' && (
          <button onClick={handleTriggerSLA} className="btn btn-primary">
            <RefreshCw size={16} /> Run SLA Escalation Check
          </button>
        )}
      </section>

      {/* Filter Controls */}
      <section className="glass-panel" style={{ padding: '1.25rem', marginBottom: '2rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontSize: '0.9rem' }}>
          <Filter size={16} /> Filters:
        </div>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
        >
          <option value="">All Priorities</option>
          <option value="CRITICAL">Critical Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '0.5rem 0.8rem', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="CLASSIFIED">Classified</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </section>

      {/* Complaints Directory Table */}
      <section className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '1.25rem' }}>Active Visitor Complaints ({complaints.length})</h3>

        {loading ? (
          <div>Loading complaints...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Ref #</th>
                  <th style={{ padding: '0.75rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem' }}>Museum</th>
                  <th style={{ padding: '0.75rem' }}>Category</th>
                  <th style={{ padding: '0.75rem' }}>Priority</th>
                  <th style={{ padding: '0.75rem' }}>Department</th>
                  <th style={{ padding: '0.75rem' }}>SLA Status</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{c.complaint_number}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: '#fff', maxWidth: '220px' }}>{c.subject}</td>
                    <td style={{ padding: '0.75rem' }}>{c.museum_name}</td>
                    <td style={{ padding: '0.75rem' }}><span className="badge badge-info">{c.category}</span></td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${c.priority === 'CRITICAL' ? 'badge-error' : 'badge-warning'}`} style={{ background: c.priority === 'CRITICAL' ? '#ef4444' : undefined, color: '#fff' }}>
                        {c.priority}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{c.assigned_department}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`badge ${c.sla_status === 'BREACHED' ? 'badge-error' : 'badge-success'}`}>
                        {c.sla_status} (Lvl {c.escalation_level})
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="badge badge-success">{c.status}</span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {c.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleStatusChange(c.id, 'RESOLVED')}
                            className="btn btn-outline"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#34d399', borderColor: 'rgba(52, 211, 153, 0.4)' }}
                          >
                            Resolve
                          </button>
                        )}
                        {role === 'ADMIN' && (
                          <button
                            onClick={() => {
                              setSelectedComplaint(c);
                              setOverrideData({
                                category: c.category,
                                priority: c.priority,
                                department: c.assigned_department,
                                reason: ''
                              });
                            }}
                            className="btn btn-outline"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Override
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Admin Classification Override Modal */}
      {selectedComplaint && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(12px)', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ color: '#fff', marginBottom: '1.25rem' }}>Manual Classification Override #{selectedComplaint.complaint_number}</h3>

            <form onSubmit={handleOverrideSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Category</label>
                <select value={overrideData.category} onChange={(e) => setOverrideData({ ...overrideData, category: e.target.value })} style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }}>
                  {['CLEANLINESS', 'SECURITY', 'MAINTENANCE', 'STAFF_BEHAVIOR', 'TICKETING', 'TECHNICAL', 'ACCESSIBILITY', 'EXHIBIT_ARTIFACT', 'FACILITY', 'SAFETY', 'OTHER'].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Priority Level</label>
                <select value={overrideData.priority} onChange={(e) => setOverrideData({ ...overrideData, priority: e.target.value })} style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }}>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(pri => (
                    <option key={pri} value={pri}>{pri}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Assigned Department</label>
                <select value={overrideData.department} onChange={(e) => setOverrideData({ ...overrideData, department: e.target.value })} style={{ width: '100%', padding: '0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }}>
                  {['ADMINISTRATION', 'SECURITY', 'MAINTENANCE', 'CLEANING', 'TECHNICAL', 'TICKETING', 'CURATORIAL', 'ACCESSIBILITY'].map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Reason for Manual Override</label>
                <input type="text" required placeholder="e.g. Correcting AI misclassification" value={overrideData.reason} onChange={(e) => setOverrideData({ ...overrideData, reason: e.target.value })} style={{ width: '100%', padding: '0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Override</button>
                <button type="button" onClick={() => setSelectedComplaint(null)} className="btn btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
