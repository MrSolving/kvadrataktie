import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

const STATUS_LABELS = {
  initierad: 'Initierad',
  under_behandling: 'Under behandling',
  genomford: 'Genomförd',
  rapporterad_euroclear: 'Rapporterad till Euroclear',
  slutford: 'Slutförd',
  avbruten: 'Avbruten',
};

function sumRows(rows, type, field) {
  return rows
    .filter(r => r.type === type && r.status !== 'avbruten')
    .reduce((acc, r) => acc + r[field], 0);
}

export default function OrderDepthPage() {
  const [periods, setPeriods] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [depth, setDepth] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/periods').then(data => {
      setPeriods(data);
      if (data.length > 0) setSelectedId(data[0].id);
    }).catch(() => setPeriods([]));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setDepth(null);
    api.get(`/orders/depth/${selectedId}`)
      .then(data => setDepth(data))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const rows = depth?.rows ?? [];
  const period = depth?.period;

  const buyRows = rows.filter(r => r.type === 'buy');
  const sellRows = rows.filter(r => r.type === 'sell');

  const totalActiveBuy = sumRows(rows, 'buy', 'remaining_quantity');
  const totalActiveSell = sumRows(rows, 'sell', 'remaining_quantity');

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-primary)', marginBottom: 8 }}>Handelsperiod</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Orderdjup</h1>

      {!periods ? (
        <div className="skeleton" style={{ height: 40, width: 280 }} />
      ) : periods.length === 0 ? (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>Inga handelsperioder finns ännu.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12 }}>
            <label htmlFor="period-select" style={{ fontSize: 13.5, fontWeight: 500 }}>Välj period</label>
            <select
              id="period-select"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{ minWidth: 220 }}
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {period && <StatusBadge status={period.status} />}
          </div>

          {loading && <div className="skeleton" style={{ height: 220 }} />}

          {!loading && depth && (
            <>
              {/* Sammanfattning */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid var(--color-primary)' }}>
                  <p style={{ fontSize: 12, color: 'var(--color-ink-soft)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Köpintresse (aktiva)</p>
                  <p className="mono" style={{ fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                    {totalActiveBuy.toLocaleString('sv-SE')}
                  </p>
                  <p style={{ fontSize: 12.5, color: 'var(--color-ink-soft)', margin: '4px 0 0' }}>aktier</p>
                </div>
                <div className="card" style={{ padding: '20px 24px', borderTop: '3px solid var(--color-accent)' }}>
                  <p style={{ fontSize: 12, color: 'var(--color-ink-soft)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Säljintresse (aktiva)</p>
                  <p className="mono" style={{ fontSize: 32, fontWeight: 700, margin: 0, color: 'var(--color-accent)' }}>
                    {totalActiveSell.toLocaleString('sv-SE')}
                  </p>
                  <p style={{ fontSize: 12.5, color: 'var(--color-ink-soft)', margin: '4px 0 0' }}>aktier</p>
                </div>
              </div>

              {/* Detaljvy per ordertyp och status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <OrderSideTable title="Köpordrar" rows={buyRows} accentVar="--color-primary" />
                <OrderSideTable title="Säljordrar" rows={sellRows} accentVar="--color-accent" />
              </div>

              {rows.length === 0 && (
                <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>Inga ordrar lagda i denna period ännu.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function OrderSideTable({ title, rows, accentVar }) {
  const total = rows.reduce((s, r) => s + r.total_quantity, 0);
  const totalRemaining = rows.reduce((s, r) => s + r.remaining_quantity, 0);
  const totalOrders = rows.reduce((s, r) => s + r.order_count, 0);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-line-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: `var(${accentVar})` }}>{title}</span>
        <span style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>{totalOrders} order{totalOrders !== 1 ? 'ar' : ''}</span>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '20px 18px' }}>
          <p style={{ fontSize: 13.5, color: 'var(--color-ink-soft)', margin: 0 }}>Inga ordrar.</p>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ordrar</th>
              <th style={{ textAlign: 'right' }}>Totalt</th>
              <th style={{ textAlign: 'right' }}>Återstår</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.status}>
                <td><StatusBadge status={r.status} /></td>
                <td className="mono" style={{ textAlign: 'right' }}>{r.order_count}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{r.total_quantity.toLocaleString('sv-SE')}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{r.remaining_quantity.toLocaleString('sv-SE')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 600 }}>
              <td>Totalt</td>
              <td className="mono" style={{ textAlign: 'right' }}>{totalOrders}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{total.toLocaleString('sv-SE')}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{totalRemaining.toLocaleString('sv-SE')}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
