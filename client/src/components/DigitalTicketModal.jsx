import React, { useState, useEffect } from 'react';
import { X, QrCode, Calendar, MapPin, Printer, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import apiClient from '../api/apiClient';

export default function DigitalTicketModal({ isOpen, onClose, bookingId }) {
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchDigitalTicket();
    }
  }, [isOpen, bookingId]);

  const fetchDigitalTicket = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.get(`/tickets/booking/${bookingId}`);
      setTicketData(data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve digital QR ticket.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(12px)', padding: '1.5rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '2rem', textAlign: 'center', border: '1px solid var(--border-color-glow)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
            <Shield size={16} /> SECURE DIGITAL TICKET
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '3rem 0', color: 'var(--text-secondary)' }}>Generating Secure QR Ticket...</div>
        ) : errorMsg ? (
          <div style={{ padding: '2rem 0', color: '#f87171' }}>{errorMsg}</div>
        ) : ticketData && (
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <span className={`badge ${ticketData.ticket.status === 'USED' ? 'badge-info' : 'badge-success'}`}>
                STATUS: {ticketData.ticket.status}
              </span>
            </div>

            <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.3rem' }}>{ticketData.booking.museum?.name || 'Government Museum'}</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Booking Ref: <strong style={{ color: 'var(--accent-gold)' }}>{ticketData.booking.booking_number}</strong>
            </div>

            {/* QR Image Container */}
            <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '16px', display: 'inline-block', marginBottom: '1.25rem', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}>
              <img src={ticketData.qrImageDataUrl} alt="Secure QR Ticket Code" style={{ width: '200px', height: '200px', display: 'block' }} />
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '6px', fontFamily: 'monospace' }}>
                HMAC Signed • One-Time Entry Only
              </div>
            </div>

            {/* Ticket Details */}
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '10px', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Visitor Name:</span>
                <strong style={{ color: '#fff' }}>{ticketData.booking.visitor_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Visit Date:</span>
                <strong style={{ color: '#fff' }}>{ticketData.booking.visit_date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Amount Paid:</span>
                <strong style={{ color: '#34d399' }}>₹{ticketData.booking.total_amount}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handlePrint} className="btn btn-outline" style={{ flex: 1 }}>
                <Printer size={16} /> Print Ticket
              </button>
              <button onClick={onClose} className="btn btn-primary" style={{ flex: 1 }}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
