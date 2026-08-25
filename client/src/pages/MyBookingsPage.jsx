import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { Ticket, Calendar, MapPin, CheckCircle2, AlertCircle, Clock, ChevronRight, QrCode } from 'lucide-react';
import DigitalTicketModal from '../components/DigitalTicketModal';

export default function MyBookingsPage() {
  const { user, isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeQrBookingId, setActiveQrBookingId] = useState(null);

  const fetchUserBookings = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/bookings/my-bookings');
      setBookings(data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserBookings();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2>Sign In Required to View Booking History</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Please sign in to access your confirmed museum entry tickets.</p>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1000px' }}>
      <section style={{ marginBottom: '2rem' }}>
        <span className="badge badge-info" style={{ marginBottom: '0.4rem' }}>VISITOR DASHBOARD</span>
        <h1 style={{ fontSize: '2.25rem' }}>My Confirmed <span className="gradient-text">Museum Tickets</span></h1>
      </section>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>Loading your tickets...</div>
      ) : bookings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Ticket size={48} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
          <h3>No Ticket Bookings Found</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You haven't booked any museum tickets yet.</p>
          <Link to="/museums" className="btn btn-primary">Explore Museums & Book Tickets</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {bookings.map(b => (
            <div key={b.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={b.museum_image || 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=300&q=80'} alt={b.museum_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>{b.booking_number}</span>
                    <span className={`badge ${b.booking_status === 'CONFIRMED' ? 'badge-success' : 'badge-info'}`}>{b.booking_status}</span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.25rem' }}>{b.museum_name}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                    <span><Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} /> Visit Date: {b.visit_date}</span>
                    <span><MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} /> {b.museum_city}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-gold)' }}>₹{b.total_amount}</div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {b.booking_status === 'CONFIRMED' && (
                    <button
                      onClick={() => setActiveQrBookingId(b.id)}
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                    >
                      <QrCode size={14} /> View QR Ticket
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      const data = await apiClient.get(`/bookings/${b.id}`);
                      setSelectedBooking(data.booking);
                    }}
                    className="btn btn-outline"
                    style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                  >
                    Receipt <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(12px)', padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ color: '#fff' }}>Booking Details #{selectedBooking.booking_number}</h3>
              <button onClick={() => setSelectedBooking(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Museum:</span> <strong>{selectedBooking.museum?.name}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Visit Date:</span> <strong>{selectedBooking.visit_date}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Visitor Name:</span> <strong>{selectedBooking.visitor_name}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Visitor Email:</span> <strong>{selectedBooking.visitor_email}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Booking Status:</span> <span className="badge badge-success">{selectedBooking.booking_status}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Payment Status:</span> <span className="badge badge-success">{selectedBooking.payment_status}</span></div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <strong style={{ display: 'block', color: '#fff', marginBottom: '0.5rem' }}>Ticket Breakdown:</strong>
                {selectedBooking.items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                    <span>{item.ticket_name} (×{item.quantity})</span>
                    <span>₹{item.total_price}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', color: '#34d399', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <span>Total Amount Paid:</span>
                  <span>₹{selectedBooking.total_amount}</span>
                </div>
              </div>
            </div>

            <button onClick={() => setSelectedBooking(null)} className="btn btn-primary" style={{ width: '100%' }}>Close Receipt</button>
          </div>
        </div>
      )}

      {/* Digital QR Ticket Modal */}
      <DigitalTicketModal
        isOpen={Boolean(activeQrBookingId)}
        onClose={() => setActiveQrBookingId(null)}
        bookingId={activeQrBookingId}
      />
    </main>
  );
}
