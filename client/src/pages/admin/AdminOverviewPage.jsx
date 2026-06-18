import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import StatusBadge from '../../components/StatusBadge.jsx';

function formatDateTime(d) {
  return new Date(d).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminOverviewPage() {
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    api.get('/admin/activity').then(setActivity);
  }, []);

  if (!activity) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-accent)', marginBottom: 8 }}>Administration</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Pågående aktiehändelser</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Öppna/pågående perioder</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24 }}>{activity.openPeriods.length}</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Senaste ordrar</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24 }}>{activity.recentOrders.length}</div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Senaste affärer</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24 }}>{activity.recentTrades.length}</div>
        </div>
      </div>

      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Öppna och pågående handelsperioder</h3>
      <div className="card" style={{ overflow: 'hidden', marginBottom: 28 }}>
        <table>
          <thead><tr><th>Period</th><th>Pris</th><th>Status</th></tr></thead>
          <tbody>
            {activity.openPeriods.length === 0 && (
              <tr><td colSpan={3} style={{ color: 'var(--color-ink-soft)' }}>Inga öppna perioder.</td></tr>
            )}
            {activity.openPeriods.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td className="mono">{p.price ?? '–'}</td>
                <td><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Senaste ordrar</h3>
      <div className="card" style={{ overflow: 'hidden', marginBottom: 28 }}>
        <table>
          <thead><tr><th>Ägare</th><th>Period</th><th>Typ</th><th>Antal</th><th>Status</th><th>Lagd</th></tr></thead>
          <tbody>
            {activity.recentOrders.map(o => (
              <tr key={o.id}>
                <td>{o.user_name}</td>
                <td>{o.period_name}</td>
                <td>{o.type === 'buy' ? 'Köp' : 'Sälj'}</td>
                <td className="mono">{o.quantity}</td>
                <td><StatusBadge status={o.status} /></td>
                <td style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>{formatDateTime(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Senaste affärer</h3>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead><tr><th>Köpare</th><th>Säljare</th><th>Antal</th><th>Pris</th><th>Status</th></tr></thead>
          <tbody>
            {activity.recentTrades.length === 0 && (
              <tr><td colSpan={5} style={{ color: 'var(--color-ink-soft)' }}>Inga affärer ännu.</td></tr>
            )}
            {activity.recentTrades.map(t => (
              <tr key={t.id}>
                <td>{t.buyer_name}</td>
                <td>{t.seller_name}</td>
                <td className="mono">{t.quantity}</td>
                <td className="mono">{t.price}</td>
                <td><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
