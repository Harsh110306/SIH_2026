import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Sparkles, MapPin, Clock, Ticket, Shield, CheckCircle2, ChevronRight, Filter, Users, Compass } from 'lucide-react';

export default function RecommendationsPage() {
  const [selectedInterests, setSelectedInterests] = useState(['history', 'archaeology']);
  const [selectedCity, setSelectedCity] = useState('');
  const [availableTime, setAvailableTime] = useState('half day');
  const [visitorType, setVisitorType] = useState('family');
  
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  const interestOptions = [
    { id: 'history', label: '📜 History & Heritage' },
    { id: 'archaeology', label: '🏺 Archaeology & Bronzes' },
    { id: 'art', label: '🎨 European Art & Miniatures' },
    { id: 'wildlife', label: '🦁 Wildlife & Sanctuaries' },
    { id: 'textiles', label: '🧵 Royal Textiles & Weaving' }
  ];

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const data = await apiClient.post('/recommendations/museums', {
        interests: selectedInterests,
        city: selectedCity,
        availableTime,
        visitorType,
        limit: 5
      });
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('Recommendation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const toggleInterest = (id) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter(i => i !== id));
    } else {
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Header */}
      <section style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', marginBottom: '0.4rem' }}>
          <Sparkles size={20} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em' }}>AI-POWERED MATCHING ENGINE</span>
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Personalized Museum & Zoo <span className="gradient-text">Recommendations</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto' }}>
          Tell us your interests and time budget, and our data-driven recommendation engine will find the best cultural heritage destinations for you.
        </p>
      </section>

      {/* Interactive Controls Form */}
      <section className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem', border: '1px solid var(--border-color-glow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem', color: '#fff' }}>
          <Filter size={20} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.25rem' }}>Select Your Visitor Preferences</h3>
        </div>

        {/* 1. Interests Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>
            1. What are your main interests? (Select multiple)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {interestOptions.map(opt => {
              const isSelected = selectedInterests.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleInterest(opt.id)}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '9999px',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: isSelected ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.06)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  {isSelected ? `✓ ${opt.label}` : opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. City, Time Budget, Visitor Type Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Target City
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            >
              <option value="">All Cities (Gujarat)</option>
              <option value="Vadodara">Vadodara</option>
              <option value="Ahmedabad">Ahmedabad</option>
              <option value="Bhuj">Bhuj</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Available Time Budget
            </label>
            <select
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            >
              <option value="1 hour">1-2 Hours (Quick Visit)</option>
              <option value="half day">Half Day (3-4 Hours)</option>
              <option value="full day">Full Day Exploration</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Visitor Group Type
            </label>
            <select
              value={visitorType}
              onChange={(e) => setVisitorType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            >
              <option value="family">Family & Children</option>
              <option value="individual">Solo / Tourist</option>
              <option value="student">Student Group</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchRecommendations}
          disabled={loading}
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
        >
          {loading ? 'Calculating Best Matches...' : 'Find Data-Driven Recommendations'} <Sparkles size={18} />
        </button>
      </section>

      {/* Recommendations Results List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
          <span className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1.25rem' }}>
            Scoring candidate museums & generating natural explanation reasons...
          </span>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <h3>No strong recommendation match found for your selected filters. Try broadening your interests!</h3>
        </div>
      ) : (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#fff' }}>Top Recommended Destinations ({recommendations.length})</h2>

          {recommendations.map((r, idx) => (
            <div key={r.museumId} className="glass-panel" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem', alignItems: 'center' }}>
              {/* Media Thumbnail */}
              <div style={{ height: '220px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                <img
                  src={r.image_url || 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=600&q=80'}
                  alt={r.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                  <span className="badge badge-success" style={{ background: '#10b981', color: '#fff', fontSize: '0.85rem', fontWeight: 800 }}>
                    #{idx + 1} • {r.matchScore}% Match
                  </span>
                </div>
              </div>

              {/* Recommendation Content & Explanation */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  <MapPin size={16} /> {r.city} • {r.type}
                </div>

                <h3 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '0.75rem' }}>{r.name}</h3>

                {/* Explanation Reason Box */}
                <div style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#e2e8f0',
                  fontSize: '0.925rem',
                  lineHeight: '1.6',
                  marginBottom: '1.25rem'
                }}>
                  💡 <strong>Why Recommended:</strong> {r.reason}
                </div>

                {/* Quick Info */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  <div><Clock size={14} style={{ display: 'inline', marginRight: '4px' }} /> {r.opening_time} - {r.closing_time} (Closed {r.closed_days})</div>
                  <div><Ticket size={14} style={{ display: 'inline', marginRight: '4px' }} /> Adult Fee: ₹{r.entry_fee_adult}</div>
                </div>

                <Link to={`/museums/${r.museumId}`} className="btn btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
                  Explore {r.name} <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
