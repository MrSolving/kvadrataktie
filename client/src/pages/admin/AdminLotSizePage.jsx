import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function AdminLotSizePage() {
  const [periods, setPeriods] = useState(null);
  const [editing, setEditing] = useState(null);
  const [lotSize, setLotSize] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setPeriods(await api.get('/admin/periods'));
  }
  useEffect(() => { load(); }, []);

  function startEdit(p) {
    setEditing(p.id);
    setLotSize(String(p.lot_size));
  }

  async function save(id) {
    setError('');
    try {
      const size = parseInt(lotSize, 10);
      if (isNaN(size) || size <= 0) throw new Error('Ange ett giltigt antal');
      await api.patch(`/admin/periods/${id}`, { lot_size: size });
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  }

  if (!periods) return <div className="skeleton" style={{ height: 240 }} />;

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-accent)', marginBottom: 8 }}>Administration</p>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Handelsposter</h1>
      <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', marginBottom: 24, maxWidth: 520 }}>
        Storleken på en handelspost styr vilket jämnt antal aktier ordrar måste läggas i för varje period.
        Standard är 100 aktier. Ändring påverkar endast nya ordrar i perioden.
      </p>

      {error && (
        <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead>
            <tr><th>Period</th><th>Status</th><th>Nuvarande poststorlek</th><th></th></tr>
          </thead>
          <tbody>
            {periods.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td><StatusBadge status={p.status} /></td>
                <td className="mono">
                  {editing === p.id ? (
                    <input
                      type="number" step="1" min="1" value={lotSize}
                      onChange={e => setLotSize(e.target.value)}
                      style={{ width: 100 }}
                    />
                  ) : `${p.lot_size} st`}
                </td>
                <td>
                  {editing === p.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-accent btn-sm" onClick={() => save(p.id)}>Spara</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Avbryt</button>
                    </div>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>Ändra</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
