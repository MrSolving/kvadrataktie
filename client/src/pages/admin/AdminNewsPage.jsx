import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

function formatDateTime(d) {
  return new Date(d).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminNewsPage() {
  const [news, setNews] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setNews(await api.get('/admin/news'));
  }
  useEffect(() => { load(); }, []);

  async function handlePublish(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/admin/news', { title, body });
      setTitle('');
      setBody('');
      load();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Ta bort denna nyhet?')) return;
    await api.delete(`/admin/news/${id}`);
    load();
  }

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-accent)', marginBottom: 8 }}>Administration</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Nyheter och information</h1>

      <form onSubmit={handlePublish} className="card" style={{ padding: 24, marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Publicera ny information</h3>
        <div className="field">
          <label>Rubrik</label>
          <input value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div className="field">
          <label>Innehåll</label>
          <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} required />
        </div>
        {error && (
          <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
            {error}
          </div>
        )}
        <button type="submit" disabled={submitting} className="btn btn-accent">
          {submitting ? 'Publicerar…' : 'Publicera'}
        </button>
      </form>

      {!news ? (
        <div className="skeleton" style={{ height: 160 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {news.map(n => (
            <div key={n.id} className="card" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.title}</div>
                <div style={{ fontSize: 13.5, color: 'var(--color-ink-soft)', marginBottom: 6 }}>{n.body}</div>
                <div style={{ fontSize: 11.5, color: 'var(--color-ink-soft)' }}>{formatDateTime(n.published_at)}</div>
              </div>
              <button className="btn btn-danger btn-sm" style={{ flexShrink: 0, height: 32 }} onClick={() => handleDelete(n.id)}>Ta bort</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
