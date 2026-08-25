import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Server, ShieldCheck, UserCheck } from 'lucide-react';
import AuthModal from '../components/AuthModal';

export default function HomePage() {
  const { user, isAuthenticated, role, logout } = useAuth();
  
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    try {
      const data = await apiClient.get('/health');
      setHealthData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Hero Header */}
      <section style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.75rem', marginBottom: '0.75rem' }}>
          Government Museum & Zoo <span className="gradient-text">AI Platform</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '720px', margin: '0 auto' }}>
          AI-Powered Visitor Assistance, Online Ticketing & Complaint Management System
        </p>

        {/* User Auth Banner */}
        <div style={{ marginTop: '1.75rem' }}>
          {isAuthenticated ? (
            <div className="glass-panel" style={{ display: 'inline-flex', alignItems: 'center', gap: '1.25rem', padding: '0.85rem 1.5rem', border: '1px solid rgba(16, 185, 129, 0.4)', flexWrap: 'wrap' }}>
              <UserCheck size={22} color="#10b981" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>Authenticated as: {user.name} ({user.email})</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Active Role: <span className={`badge ${role === 'ADMIN' ? 'badge-warning' : role === 'STAFF' ? 'badge-info' : 'badge-success'}`}>{role}</span>
                </div>
              </div>
              <button onClick={logout} className="btn btn-outline" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                Log Out
              </button>
            </div>
          ) : (
            <button onClick={() => setIsAuthOpen(true)} className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
              <ShieldCheck size={20} /> Sign In with Email OTP / Google
            </button>
          )}
        </div>
      </section>

      {/* Backend API Connection Status Banner */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Server size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.1rem' }}>Express Backend API & Database</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {loadingHealth ? 'Checking system status...' : healthData?.message}
                </p>
              </div>
            </div>
            <div>
              <span className="badge badge-success"><span className="pulse-dot"></span> BACKEND ONLINE</span>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}
