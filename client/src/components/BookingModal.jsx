import React, { useState, useEffect } from 'react';
import { X, Calendar, Ticket, CheckCircle2, AlertCircle, CreditCard, Shield, User, Mail, Phone, ChevronRight } from 'lucide-react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

export default function BookingModal({ isOpen, onClose, museum }) {
  const { user, isAuthenticated } = useAuth();

  const [step, setStep] = useState(1); // 1: Date & Tickets, 2: Visitor Info, 3: Payment, 4: Confirmed
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [visitDate, setVisitDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  const [quantities, setQuantities] = useState({});
  const [visitorName, setVisitorName] = useState(user?.name || '');
  const [visitorEmail, setVisitorEmail] = useState(user?.email || '');
  const [visitorPhone, setVisitorPhone] = useState('');

  const [booking, setBooking] = useState(null);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen && museum) {
      setStep(1);
      setErrorMsg(null);
      fetchTicketTypes();
    }
  }, [isOpen, museum]);

  useEffect(() => {
    if (user) {
      setVisitorName(user.name || '');
      setVisitorEmail(user.email || '');
    }
  }, [user]);

  const fetchTicketTypes = async () => {
    setLoadingTickets(true);
    try {
      const data = await apiClient.get(`/museums/${museum.id}/tickets`);
      setTicketTypes(data.ticketTypes || []);
      // Initialize quantities
      const initialQty = {};
      (data.ticketTypes || []).forEach(t => { initialQty[t.id] = 0; });
      setQuantities(initialQty);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleQtyChange = (ticketId, delta) => {
    setQuantities(prev => ({
      ...prev,
      [ticketId]: Math.max(0, (prev[ticketId] || 0) + delta)
    }));
  };

  const calculateTotal = () => {
    return ticketTypes.reduce((acc, t) => {
      const qty = quantities[t.id] || 0;
      return acc + (qty * t.price);
    }, 0);
  };

  const totalAmount = calculateTotal();
  const selectedItems = ticketTypes
    .filter(t => (quantities[t.id] || 0) > 0)
    .map(t => ({ ticketTypeId: t.id, quantity: quantities[t.id] }));

  const handleCreateBookingOrder = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedItems.length === 0) {
      setErrorMsg('Please select at least 1 ticket to proceed.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiClient.post('/bookings', {
        museumId: museum.id,
        visitDate,
        visitorName,
        visitorEmail,
        visitorPhone,
        items: selectedItems
      });

      if (res.success) {
        setBooking(res.booking);
        setPaymentOrder(res.paymentOrder);
        setStep(3); // Proceed to Payment
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to initialize booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.post(`/bookings/${booking.id}/verify-payment`, {
        transactionId: paymentOrder.transactionId,
        status: 'SUCCESS'
      });

      if (res.success) {
        setBooking(res.booking);
        setStep(4); // Booking Confirmed
      } else {
        setErrorMsg('Payment verification failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Payment simulation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !museum) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 15, 0.85)', backdropFilter: 'blur(12px)', padding: '1.5rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border-color-glow)' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <span className="badge badge-success" style={{ marginBottom: '0.3rem' }}>ONLINE TICKETING SYSTEM</span>
            <h2 style={{ fontSize: '1.35rem', color: '#fff' }}>{museum.name}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* STEP 1: Date & Ticket Selection */}
        {step === 1 && (
          <div>
            {/* Visit Date */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: 600 }}>
                1. Select Visit Date
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.95rem' }}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                * Operating Hours: {museum.opening_time} - {museum.closing_time} (Closed on {museum.closed_days})
              </div>
            </div>

            {/* Ticket Categories */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                2. Select Ticket Quantities
              </label>

              {loadingTickets ? (
                <div>Loading ticket categories...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {ticketTypes.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem' }}>{t.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.description || 'Standard Entry'}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', fontWeight: 700, marginTop: '2px' }}>₹{t.price}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(t.id, -1)}
                          style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          -
                        </button>
                        <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold', color: '#fff' }}>
                          {quantities[t.id] || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(t.id, 1)}
                          style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--accent-emerald)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Footer Bar */}
            <div style={{ padding: '1rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Ticket Payable</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>₹{totalAmount}</div>
              </div>

              <button
                type="button"
                disabled={totalAmount === 0}
                onClick={() => setStep(2)}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Next: Visitor Info <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Visitor Details */}
        {step === 2 && (
          <form onSubmit={handleCreateBookingOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Primary Visitor Full Name</label>
              <input type="text" required value={visitorName} onChange={(e) => setVisitorName(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Email Address (for Receipt & Confirmation)</label>
              <input type="email" required value={visitorEmail} onChange={(e) => setVisitorEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Mobile Phone Number</label>
              <input type="tel" placeholder="+91 9876543210" value={visitorPhone} onChange={(e) => setVisitorPhone(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff' }} />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.4rem' }}>Booking Summary:</div>
              <div>Visit Date: <strong>{visitDate}</strong></div>
              <div>Total Amount: <strong>₹{totalAmount}</strong></div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => setStep(1)} className="btn btn-outline">Back</button>
              <button type="submit" disabled={isProcessing} className="btn btn-primary" style={{ flex: 1 }}>
                {isProcessing ? 'Initializing Payment...' : `Proceed to Pay ₹${totalAmount}`}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Payment Sandbox Gateway Simulation */}
        {step === 3 && booking && paymentOrder && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <CreditCard size={28} />
            </div>

            <h3 style={{ fontSize: '1.4rem', color: '#fff', marginBottom: '0.5rem' }}>Government Payment Gateway Sandbox</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Order Transaction Reference: <strong>{paymentOrder.transactionId}</strong>
            </p>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '10px', textAlign: 'left', marginBottom: '1.5rem', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Booking Reference:</span>
                <strong style={{ color: '#fff' }}>{booking.booking_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Museum:</span>
                <strong style={{ color: '#fff' }}>{museum.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Visit Date:</span>
                <strong style={{ color: '#fff' }}>{booking.visit_date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '1.1rem' }}>
                <span>Amount Payable:</span>
                <strong style={{ color: '#34d399' }}>₹{booking.total_amount}</strong>
              </div>
            </div>

            <button
              onClick={handleSimulatePayment}
              disabled={isProcessing}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}
            >
              {isProcessing ? 'Verifying Backend Signature...' : `Simulate Successful Payment (₹${booking.total_amount})`}
            </button>
          </div>
        )}

        {/* STEP 4: Booking Confirmation */}
        {step === 4 && booking && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <CheckCircle2 size={36} />
            </div>

            <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>BOOKING CONFIRMED</span>
            <h2 style={{ fontSize: '1.75rem', color: '#fff', marginBottom: '0.5rem' }}>Ticket Booking Successful!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Confirmation details have been emailed to <strong>{booking.visitor_email}</strong>.
            </p>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1.25rem', borderRadius: '12px', textAlign: 'left', marginBottom: '1.5rem', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Booking ID:</span>
                <strong style={{ color: 'var(--accent-gold)', fontSize: '1.05rem' }}>{booking.booking_number}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Museum:</span>
                <strong style={{ color: '#fff' }}>{museum.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Visit Date:</span>
                <strong style={{ color: '#fff' }}>{booking.visit_date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Status:</span>
                <span className="badge badge-success">{booking.payment_status}</span>
              </div>
            </div>

            <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
              Done / Close
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
