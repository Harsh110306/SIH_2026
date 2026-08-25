import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Shield, Plus, Edit, Trash2, Landmark, Layers, Calendar, Image, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminPortalPage() {
  const { user, role, switchUserRole } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('museums'); // 'museums', 'galleries', 'exhibitions', 'artifacts', 'animals'
  const [museums, setMuseums] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State for New Museum
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'MUSEUM',
    description: '',
    short_description: '',
    address: '',
    city: 'Vadodara',
    state: 'Gujarat',
    entry_fee_adult: 50,
    entry_fee_child: 20,
    facilities: 'Restrooms, Parking, Guided Tours',
    image_url: ''
  });
  const [formMsg, setFormMsg] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/museums?status=ACTIVE');
      setMuseums(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const handleCreateMuseum = async (e) => {
    e.preventDefault();
    setFormMsg(null);
    try {
      await apiClient.post('/museums', formData);
      setFormMsg({ type: 'success', text: 'Museum record created successfully!' });
      setShowAddModal(false);
      fetchAdminData();
    } catch (err) {
      setFormMsg({ type: 'error', text: err.message || 'Failed to create museum.' });
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this museum record?')) return;
    try {
      await apiClient.patch(`/museums/${id}/status`);
      fetchAdminData();
    } catch (err) {
      alert(err.message || 'Deactivation failed');
    }
  };

  if (!isAdmin) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '560px', margin: '0 auto', padding: '3rem 2rem', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
          <Shield size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Admin Authorization Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            You are currently logged in with the <strong>{role}</strong> role. Only authorized Administrators can access data management controls.
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
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-warning" style={{ marginBottom: '0.5rem' }}>
            <Shield size={12} /> ADMIN MANAGEMENT PORTAL
          </span>
          <h1 style={{ fontSize: '2.25rem' }}>Government Heritage & Zoo <span className="gradient-text">Data Center</span></h1>
        </div>

        <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
          <Plus size={18} /> Add New Museum / Zoo
        </button>
      </section>

      {/* Tabs */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          {['museums', 'galleries', 'exhibitions', 'artifacts', 'animals'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === t ? 'var(--accent-emerald)' : 'transparent',
                color: activeTab === t ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Tab: Museums & Zoos */}
      {activeTab === 'museums' && (
        <section className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: '#fff' }}>Active Museums & Zoos Directory ({museums.length})</h3>

          {loading ? (
            <div>Loading records...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem' }}>ID</th>
                    <th style={{ padding: '0.75rem' }}>Name</th>
                    <th style={{ padding: '0.75rem' }}>Category Type</th>
                    <th style={{ padding: '0.75rem' }}>City</th>
                    <th style={{ padding: '0.75rem' }}>Adult Entry Fee</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {museums.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>#{m.id}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#fff' }}>{m.name}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className={`badge ${m.type === 'ZOO' ? 'badge-info' : 'badge-success'}`}>{m.type}</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{m.city}</td>
                      <td style={{ padding: '0.75rem' }}>₹{m.entry_fee_adult}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge badge-success">{m.status}</span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeactivate(m.id)}
                          className="btn btn-outline"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Add New Museum Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(12px)', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#fff' }}>Add Government Museum or Zoo</h2>

            <form onSubmit={handleCreateMuseum} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Institution Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Category Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: '0.7rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }}>
                    <option value="MUSEUM">Museum</option>
                    <option value="ZOO">Zoo & Sanctuary</option>
                    <option value="HERITAGE_SITE">Heritage Site</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>City</label>
                  <input type="text" required value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Full Description</label>
                <textarea required rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Address</label>
                <input type="text" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Adult Ticket Fee (₹)</label>
                  <input type="number" required value={formData.entry_fee_adult} onChange={(e) => setFormData({ ...formData, entry_fee_adult: parseFloat(e.target.value) })} style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Image URL</label>
                  <input type="url" placeholder="https://..." value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} style={{ width: '100%', padding: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '6px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Record</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
