import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

function formatSek(value) {
  if (value === null || value === undefined) return '–';
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value) + ' kr';
}
function formatDateTime(d) {
  return new Date(d).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const data = await api.get('/orders/mine');
    setOrders(data);
  }

  useEffect(() => { load(); }, []);

  async function handleCancel(id) {
    if (!confirm('Vill du avbryta denna order?')) return;
    try {
      await api.delete(`/orders/${id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveEdit(id) {
    try {
      await api.patch(`/orders/${id}`, { quantity: parseInt(editQty, 10) });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!orders) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-primary)', marginBottom: 8 }}>Order</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Mina ordrar</h1>

      {error && (
        <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>Du har inte lagt några ordrar ännu.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Typ</th>
                <th>Aktier</th>
                <th>Antal</th>
                <th>Återstår</th>
                <th>Pris</th>
                <th>Status</th>
                <th>Lagd</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.period_name}</td>
                  <td>
                    <span className={`badge ${o.type === 'buy' ? 'badge-info' : 'badge-neutral'}`}>
                      {o.type === 'buy' ? 'Köp' : 'Sälj'}
                    </span>
                  </td>
                  <td>
                    {o.type === 'sell' && o.share_type ? (
                      <span style={{ fontSize: 11.5, background: 'var(--color-line-soft)', borderRadius: 4, padding: '2px 7px' }}>
                        {o.share_type === 'privat' ? 'Privat' : 'Företag'}
                      </span>
                    ) : '–'}
                  </td>
                  <td className="mono">
                    {editingId === o.id ? (
                      <input
                        type="number" step="100" min="100" value={editQty}
                        onChange={e => setEditQty(e.target.value)}
                        style={{ width: 90, padding: '4px 8px' }}
                      />
                    ) : o.quantity}
                  </td>
                  <td className="mono">{o.remaining_quantity}</td>
                  <td className="mono">{formatSek(o.period_price)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>{formatDateTime(o.created_at)}</td>
                  <td>
                    {o.status === 'initierad' && (
                      editingId === o.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(o.id)}>Spara</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Avbryt</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(o.id); setEditQty(String(o.quantity)); }}>Ändra</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(o.id)}>Ta bort</button>
                        </div>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
