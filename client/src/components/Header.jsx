import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Shield, LogIn, LogOut, User as UserIcon, Compass, Database, Bot, Sparkles, Ticket, QrCode, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import UserProfileModal from './UserProfileModal';

export default function Header() {
  const { user, isAuthenticated, role, logout } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <>
      <header className="site-header">
        <div className="container nav-wrapper">
          <Link to="/" className="brand-logo">
            <div className="brand-icon">
              <Landmark size={22} />
            </div>
            <div>
              <div className="brand-title">AETHERIA</div>
              <div className="brand-subtitle">Ticketing & Visitor Assistance Platform</div>
            </div>
          </Link>

          <nav>
            <ul className="nav-links">
              <li>
                <Link to="/museums" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Compass size={16} /> Explore Museums & Zoos
                </Link>
              </li>

              <li>
                <Link to="/recommendations" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-gold)' }}>
                  <Sparkles size={16} /> Recommendations
                </Link>
              </li>

              <li>
                <Link to="/chat" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#10b981' }}>
                  <Bot size={16} /> AI Assistant
                </Link>
              </li>

              {isAuthenticated && (
                <>
                  <li>
                    <Link to="/my-bookings" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}>
                      <Ticket size={16} /> My Bookings
                    </Link>
                  </li>

                  <li>
                    <Link to="/submit-complaint" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#f87171' }}>
                      <AlertCircle size={16} /> Report Issue
                    </Link>
                  </li>
                </>
              )}

              {['STAFF', 'ADMIN'].includes(role) && (
                <>
                  <li>
                    <Link to="/staff/scanner" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}>
                      <QrCode size={16} /> Staff Scanner
                    </Link>
                  </li>

                  <li>
                    <Link to="/admin/complaints" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b' }}>
                      <AlertCircle size={16} /> Complaints Portal
                    </Link>
                  </li>
                </>
              )}

              {role === 'ADMIN' && (
                <li>
                  <Link to="/admin" className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b' }}>
                    <Database size={16} /> Admin Portal
                  </Link>
                </li>
              )}

              {isAuthenticated ? (
                <>
                  <li>
                    <span className={`badge ${role === 'ADMIN' ? 'badge-warning' : role === 'STAFF' ? 'badge-info' : 'badge-success'}`}>
                      <Shield size={12} /> {role}
                    </span>
                  </li>

                  <li>
                    <button 
                      onClick={() => setIsProfileOpen(true)}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                    >
                      <UserIcon size={14} /> {user?.name || 'My Profile'}
                    </button>
                  </li>

                  <li>
                    <button 
                      onClick={logout} 
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
                    >
                      <LogOut size={14} /> Log Out
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <button 
                    onClick={() => setIsAuthOpen(true)}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    <LogIn size={16} /> Sign In / Register
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* User Profile Modal */}
      <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
