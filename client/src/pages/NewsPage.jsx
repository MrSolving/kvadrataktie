import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

function formatDateTime(d) {
  return new Date(d).toLocaleString('sv-SE', { dateStyle: 'long', timeStyle: 'short' });
}

export default function NewsPage() {
  const [news, setNews] = useState(null);

  useEffect(() => {
    api.get('/portfolio/dashboard').then(d => setNews(d.news));
  }, []);

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-primary)', marginBottom: 8 }}>Information</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Nyheter</h1>

      {!news ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : news.length === 0 ? (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>Inga nyheter publicerade ännu.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {news.map(n => (
            <div key={n.id} className="card" style={{ padding: 22 }}>
              <h3 style={{ fontSize: 17, marginBottom: 8 }}>{n.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', lineHeight: 1.6, marginBottom: 10 }}>{n.body}</p>
              <div style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>{formatDateTime(n.published_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
