import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

function formatDate(d) {
  return new Date(d).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatSek(value) {
  if (value === null || value === undefined) return 'Ej fastställt';
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value) + ' kr';
}

export default function CalendarPage() {
  const [calendar, setCalendar] = useState(null);
  const [periods, setPeriods] = useState(null);

  useEffect(() => {
    api.get('/admin/calendar').catch(() => null).then(c => setCalendar(c || []));
    api.get('/periods').then(setPeriods);
  }, []);

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-primary)', marginBottom: 8 }}>Kalender</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Handelskalender</h1>

      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Handelsperioder</h3>
      {!periods ? (
        <div className="skeleton" style={{ height: 100, marginBottom: 28 }} />
      ) : (
        <div className="card" style={{ overflow: 'hidden', marginBottom: 28 }}>
          <table>
            <thead>
              <tr><th>Period</th><th>Start</th><th>Slut</th><th>Pris</th><th>Status</th></tr>
            </thead>
            <tbody>
              {periods.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{formatDate(p.start_date)}</td>
                  <td>{formatDate(p.end_date)}</td>
                  <td className="mono">{formatSek(p.price)}</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Kommande planerade perioder</h3>
      {!calendar ? (
        <div className="skeleton" style={{ height: 80 }} />
      ) : calendar.length === 0 ? (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>Inga planerade perioder ännu.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {calendar.map(c => (
            <div key={c.id} className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginBottom: c.notes ? 6 : 0 }}>
                {formatDate(c.start_date)} – {formatDate(c.end_date)}
              </div>
              {c.notes && <div style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>{c.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
