import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ArrowLeft, Landmark, Clock, MapPin, Tag, Sparkles } from 'lucide-react';

export default function ArtifactDetailPage() {
  const { id } = useParams();
  const [artifact, setArtifact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtifact = async () => {
      setLoading(true);
      try {
        const data = await apiClient.get(`/artifacts/${id}`);
        setArtifact(data.artifact);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArtifact();
  }, [id]);

  if (loading) {
    return <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Loading artifact details...</main>;
  }

  if (!artifact) {
    return <main className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Artifact record not found.</main>;
  }

  return (
    <main className="container" style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to={`/museums/${artifact.museum_id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} /> Back to Museum
        </Link>
      </div>

      <div className="glass-panel" style={{ padding: '2.5rem', display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '2.5rem' }}>
        {/* Artifact Media Image */}
        <div style={{ borderRadius: '14px', overflow: 'hidden', height: '360px', border: '1px solid var(--border-color)' }}>
          <img src={artifact.image_url || 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=800&q=80'} alt={artifact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {/* Artifact Details */}
        <div>
          <span className="badge badge-warning" style={{ marginBottom: '0.75rem' }}>
            <Sparkles size={12} /> {artifact.category || 'Historical Artifact'}
          </span>
          <h1 style={{ fontSize: '2.2rem', color: '#fff', marginBottom: '0.5rem' }}>{artifact.name}</h1>
          <div style={{ color: 'var(--accent-gold)', fontSize: '1rem', fontWeight: '600', marginBottom: '1.25rem' }}>
            ⌛ Era: {artifact.time_period || 'Ancient Period'}
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.8', marginBottom: '1.5rem' }}>
            {artifact.description}
          </p>

          {artifact.historical_info && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', marginBottom: '0.4rem' }}>Verified Historical Background</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{artifact.historical_info}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Origin:</span> <strong>{artifact.origin || 'Gujarat, India'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Material:</span> <strong>{artifact.material || 'Bronze Alloy'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Dimensions:</span> <strong>{artifact.dimensions || 'Standard'}</strong></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Location:</span> <strong>{artifact.museum?.name}</strong></div>
          </div>
        </div>
      </div>
    </main>
  );
}
