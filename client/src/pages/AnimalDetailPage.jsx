import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ArrowLeft, Shield, Globe, Utensils, Feather } from 'lucide-react';

export default function AnimalDetailPage() {
  const { id } = useParams();
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnimal = async () => {
      setLoading(true);
      try {
        const data = await apiClient.get(`/animals/${id}`);
        setAnimal(data.animal);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnimal();
  }, [id]);

  if (loading) {
    return <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Loading animal record...</main>;
  }

  if (!animal) {
    return <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Animal record not found.</main>;
  }

  return (
    <main className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to={`/museums/${animal.zoo_id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to Zoo
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2.5rem' }}>
        {/* Animal Image */}
        <div style={{ borderRadius: '14px', overflow: 'hidden', height: '360px', border: '1px solid var(--border-color)' }}>
          <img src={animal.image_url || 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80'} alt={animal.common_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* Animal Details */}
        <div>
          <span className="badge badge-info" style={{ marginBottom: '0.75rem' }}>
            <Shield size={12} /> {animal.conservation_status || 'Protected Species'}
          </span>
          <h1 style={{ fontSize: '2.2rem', color: '#fff', marginBottom: '0.25rem' }}>{animal.common_name}</h1>
          <div style={{ color: 'var(--accent-cyan)', fontSize: '1.1rem', fontStyle: 'italic', marginBottom: '1.25rem' }}>
            {animal.scientific_name}
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
            {animal.description}
          </p>

          {animal.interesting_facts && (
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <h4 style={{ fontSize: '0.95rem', color: '#34d399', marginBottom: '0.4rem' }}>💡 Interesting Facts</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{animal.interesting_facts}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Native Region:</span> <strong>{animal.native_region || 'Gujarat, India'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Habitat:</span> <strong>{animal.habitat || 'Forest Scrubland'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Diet:</span> <strong>{animal.diet || 'Carnivore'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Zoo Section:</span> <strong>{animal.section?.name || 'Main Sanctuary'}</strong></div>
          </div>
        </div>
      </div>
    </main>
  );
}
