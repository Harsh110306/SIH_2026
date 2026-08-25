import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { Landmark, MapPin, Clock, Search, Filter, Shield, ChevronRight } from 'lucide-react';

export default function MuseumsPage() {
  const [museums, setMuseums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const fetchMuseums = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedType) params.type = selectedType;
      if (selectedCity) params.city = selectedCity;

      const data = await apiClient.get('/museums', { params });
      setMuseums(data.items || []);
    } catch (err) {
      console.error('Failed to fetch museums:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMuseums();
  }, [selectedType, selectedCity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMuseums();
  };

  return (
    <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
      {/* Page Header */}
      <section style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Explore Government <span className="gradient-text">Museums & Zoos</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '680px', margin: '0 auto' }}>
          Discover verified cultural heritage sites, historical galleries, royal artifacts, and wildlife sanctuaries across Gujarat.
        </p>
      </section>

      {/* Filter & Search Bar */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 280px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search museum, artifact, or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.7rem 0.7rem 2.5rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            {/* Type Filter */}
            <div style={{ flex: '0 1 180px' }}>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
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
                <option value="">All Category Types</option>
                <option value="MUSEUM">Museums</option>
                <option value="ZOO">Zoos & Aviaries</option>
                <option value="HERITAGE_SITE">Heritage Sites</option>
              </select>
            </div>

            {/* City Filter */}
            <div style={{ flex: '0 1 160px' }}>
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
                <option value="">All Cities</option>
                <option value="Vadodara">Vadodara</option>
                <option value="Ahmedabad">Ahmedabad</option>
                <option value="Bhuj">Bhuj</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Museums List Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <div className="badge badge-warning" style={{ fontSize: '1rem', padding: '0.5rem 1.25rem' }}>
            Loading verified museum database...
          </div>
        </div>
      ) : museums.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <h3>No museums or zoos found matching your filter criteria.</h3>
        </div>
      ) : (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
          {museums.map((m) => (
            <div key={m.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Image Banner */}
              <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
                <img
                  src={m.image_url || 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80'}
                  alt={m.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'var(--transition-smooth)' }}
                />
                <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                  <span className={`badge ${m.type === 'ZOO' ? 'badge-info' : m.type === 'HERITAGE_SITE' ? 'badge-warning' : 'badge-success'}`}>
                    {m.type}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', color: '#fff' }}>{m.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    <MapPin size={14} /> {m.city}, {m.state}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.short_description || m.description}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={14} /> {m.opening_time} - {m.closing_time}
                    </div>
                    <div style={{ color: '#10b981', fontWeight: 600 }}>
                      Adult ₹{m.entry_fee_adult}
                    </div>
                  </div>

                  <Link to={`/museums/${m.id}`} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                    Explore Museum <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
