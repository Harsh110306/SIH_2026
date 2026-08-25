import React, { useState, useRef } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { QrCode, ShieldCheck, AlertTriangle, CheckCircle2, UserCheck, Shield, Upload, FileImage } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function StaffScannerPage() {
  const { user, role, isStaff, isAdmin } = useAuth();
  const [qrInput, setQrInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [decodingImage, setDecodingImage] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const isAuthorized = isStaff || isAdmin;

  const executeValidation = async (payloadToScan) => {
    if (!payloadToScan || !payloadToScan.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await apiClient.post('/tickets/validate', {
        qrPayload: payloadToScan.trim()
      });

      setResult({
        type: 'success',
        message: data.message,
        ticket: data.ticket,
        booking: data.booking
      });
      setQrInput('');
    } catch (err) {
      console.error(err);
      setResult({
        type: 'error',
        code: err.errorCode || 'VALIDATION_FAILED',
        message: err.message || 'Ticket validation failed.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScanSubmit = (e) => {
    e.preventDefault();
    executeValidation(qrInput);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDecodingImage(true);
    setResult(null);

    try {
      const html5QrCode = new Html5Qrcode("qr-file-decoder");
      const decodedPayload = await html5QrCode.scanFile(file, true);
      
      if (decodedPayload) {
        setQrInput(decodedPayload);
        // Automatically validate the decoded QR payload against backend HMAC/One-time validator
        await executeValidation(decodedPayload);
      }
    } catch (err) {
      console.error("[QR File Decoder Error]", err);
      setResult({
        type: 'error',
        code: 'QR_DECODE_FAILED',
        message: 'Could not decode QR code from the selected image. Please ensure the image contains a clear digital ticket QR.'
      });
    } finally {
      setDecodingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!isAuthorized) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '560px', margin: '0 auto', padding: '3rem 2rem', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
          <Shield size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Staff Authorization Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Only assigned Museum Staff and Administrators can access the entry QR ticket scanner. You are currently logged in as <strong>{role}</strong>.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem', maxWidth: '1000px' }}>
      {/* Hidden container required by Html5Qrcode for DOM canvas decoding */}
      <div id="qr-file-decoder" style={{ display: 'none' }}></div>

      {/* Header */}
      <section style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode size={22} />
            </div>
            <h1 style={{ fontSize: '2rem' }}>Staff Ticket Entry Scanner</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Cryptographic HMAC QR Code & Multi-Visitor Accounting Scanner
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <UserCheck size={18} color="#10b981" />
          <div style={{ fontSize: '0.85rem' }}>
            <div>Officer: <strong>{user?.name}</strong></div>
            <div style={{ color: 'var(--text-muted)' }}>Role: <span className="badge badge-info">{role}</span></div>
          </div>
        </div>
      </section>

      {/* Scanner & Decoder Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Manual Payload / Optical Reader Panel */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={18} color="var(--accent-emerald)" /> Manual Payload / Optical Input
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Paste the raw JSON string decoded by an optical hardware scanner.
          </p>

          <form onSubmit={handleScanSubmit}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <textarea
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder='{"t":"qr_...","b":"MUS-2026-...","s":"..."}'
                rows={4}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: '#0b0f19',
                  border: '1px solid var(--border-color)',
                  color: '#34d399',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !qrInput.trim()}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? 'Validating HMAC Signature...' : '🔒 Validate Ticket Entry'}
            </button>
          </form>
        </div>

        {/* Browser Image / Photo File QR Decoder */}
        <div className="glass-panel" style={{ padding: '1.75rem', border: '1px dashed var(--accent-cyan)' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
            <FileImage size={18} /> Upload / Paste Ticket QR Image
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Select or upload a digital ticket image (PNG/JPG/WEBP) from the visitor's device.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={decodingImage || loading}
            className="btn btn-outline"
            style={{
              width: '100%',
              height: '110px',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              borderColor: 'rgba(6, 182, 212, 0.4)',
              background: 'rgba(6, 182, 212, 0.05)'
            }}
          >
            <Upload size={28} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {decodingImage ? 'Decoding QR Code...' : 'Click to Upload / Select QR Image'}
            </span>
          </button>
        </div>
      </div>

      {/* Validation Result Box */}
      {result && (
        <div className="glass-panel" style={{
          padding: '2rem',
          borderColor: result.type === 'success' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          background: result.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            {result.type === 'success' ? (
              <CheckCircle2 size={32} color="#10b981" style={{ flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={32} color="#ef4444" style={{ flexShrink: 0 }} />
            )}

            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '1.4rem',
                color: result.type === 'success' ? '#34d399' : '#f87171',
                marginBottom: '0.5rem'
              }}>
                {result.type === 'success' ? '✅ ENTRY ALLOWED — Ticket Validated' : '❌ ENTRY DENIED — Ticket Rejected'}
              </h2>

              <p style={{ fontSize: '1rem', marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
                {result.message}
              </p>

              {result.ticket && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1.25rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Booking Reference</div>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#fff' }}>
                      {result.ticket.booking_ref}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Museum & Visitor Date</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                      {result.booking?.museum_name} ({result.ticket.visit_date})
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Checked In Accounting</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#34d399' }}>
                      Checked In: {result.ticket.checked_in_count || 1} / {result.ticket.total_allowed || result.ticket.total_visitors || 1}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cryptographic HMAC Status</div>
                    <div style={{ fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <ShieldCheck size={14} /> HMAC SHA-256 Signature Verified
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
