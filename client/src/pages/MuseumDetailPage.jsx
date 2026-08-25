import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { MapPin, Clock, Calendar, Ticket, Phone, Mail, Globe, Layers, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import BookingModal from '../components/BookingModal';

export default function MuseumDetailPage() {
  const { id } = useParams();
  const [museum, setMuseum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'galleries', 'exhibitions', 'artifacts', 'animals'
  const [artifacts, setArtifacts] = useState([]);
  const [animals, setAnimals] = useState([]);

  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    const fetchMuseum = async () => {
      setLoading(true);
      try {
        const data = await apiClient.get(`/museums/${id}`);
        setMuseum(data.museum);

        if (data.museum.type === 'ZOO') {
          const animalData = await apiClient.get(`/museums/${id}/animals`);
          setAnimals(animalData.items || []);
        } else {
          const artifactData = await apiClient.get(`/museums/${id}/artifacts`);
          setArtifacts(artifactData.items || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMuseum();
  }, [id]);

  if (loading) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div>Loading museum & zoo information...</div>
      </main>
    );
  }

  if (!museum) {
    return (
      <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2>Institution Record Not Found</h2>
        <Link to="/museums" className="btn btn-outline" style={{ marginTop: '1rem' }}>Back to Directory</Link>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '2rem 1.5rem' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/museums" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} /> Back to Directory
        </Link>
      </div>

      {/* Hero Banner */}
      <section className="glass-panel" style={{ padding: '2.5rem', marginBottom: '2.5rem', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2.5rem' }}>
        <div style={{ borderRadius: '14px', overflow: 'hidden', height: '340px', border: '1px solid var(--border-color)' }}>
          <img
            src={museum.image_url || 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80'}
            alt={museum.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className={`badge ${museum.type === 'ZOO' ? 'badge-info' : 'badge-success'}`}>{museum.type}</span>
            <span className="badge badge-warning">{museum.city}, {museum.state}</span>
          </div>

          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.75rem', color: '#fff' }}>{museum.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
            {museum.description}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Clock size={16} color="var(--accent-emerald)" />
              <span>{museum.opening_time} - {museum.closing_time} (Closed {museum.closed_days})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Ticket size={16} color="var(--accent-gold)" />
              <span>Entry: Adult ₹{museum.entry_fee_adult} • Child ₹{museum.entry_fee_child}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setIsBookingOpen(true)} className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              <Ticket size={18} /> Book Entry Tickets Now
            </button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          {['overview', 'galleries', 'exhibitions', museum.type === 'ZOO' ? 'animals' : 'artifacts'].map((t) => (
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

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <section className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#fff' }}>Visitor Information & Facilities</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{museum.short_description || museum.description}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', fontSize: '0.9rem' }}>
            <div><strong style={{ color: '#fff' }}>Address:</strong> {museum.address}, {museum.city}</div>
            <div><strong style={{ color: '#fff' }}>Facilities:</strong> {museum.facilities || 'Restrooms, Guided Tours'}</div>
            <div><strong style={{ color: '#fff' }}>Accessibility:</strong> {museum.accessibility_info || 'Wheelchair Ramp Accessible'}</div>
            <div><strong style={{ color: '#fff' }}>Foreigner Ticket Fee:</strong> ₹{museum.entry_fee_foreigner}</div>
          </div>
        </section>
      )}

      {/* Tab: Galleries / Sections */}
      {activeTab === 'galleries' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {(museum.galleries || museum.sections || []).map((g) => (
            <div key={g.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div className="badge badge-info" style={{ marginBottom: '0.5rem' }}>{g.floor || 'Section'}</div>
              <h4 style={{ fontSize: '1.15rem', color: '#fff', marginBottom: '0.4rem' }}>{g.name}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{g.description}</p>
            </div>
          ))}
        </section>
      )}

      {/* Tab: Exhibitions */}
      {activeTab === 'exhibitions' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {(museum.exhibitions || []).map((e) => (
            <div key={e.id} className="glass-panel" style={{ padding: '1.5rem' }}>
              <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>{e.status}</span>
              <h4 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.4rem' }}>{e.title}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{e.description}</p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dates: {e.start_date} to {e.end_date}</div>
            </div>
          ))}
        </section>
      )}

      {/* Tab: Artifacts */}
      {activeTab === 'artifacts' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {artifacts.map((a) => (
            <div key={a.id} className="glass-panel" style={{ padding: '1.25rem', overflow: 'hidden' }}>
              <div style={{ height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                <img src={a.image_url || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80'} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span className="badge badge-warning" style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>{a.category}</span>
              <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '0.3rem' }}>{a.name}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{a.description.substring(0, 80)}...</p>
              <Link to={`/artifacts/${a.id}`} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', width: '100%', textAlign: 'center' }}>
                View Artifact Details
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* Tab: Animals */}
      {activeTab === 'animals' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {animals.map((an) => (
            <div key={an.id} className="glass-panel" style={{ padding: '1.25rem', overflow: 'hidden' }}>
              <div style={{ height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
                <img src={an.image_url || 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=600&q=80'} alt={an.common_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.75rem', marginBottom: '0.3rem' }}>{an.conservation_status}</span>
              <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '0.2rem' }}>{an.common_name}</h4>
              <div style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>{an.scientific_name}</div>
              <Link to={`/animals/${an.id}`} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', width: '100%', textAlign: 'center' }}>
                View Animal Details
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* Ticket Booking Modal */}
      <BookingModal isOpen={isBookingOpen} onClose={() => setIsBookingOpen(false)} museum={museum} />
    </main>
  );
}
