import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const emptyForm = { name: '', start_date: '', end_date: '', price: '', lot_size: 100 };

export default function AdminPeriodsPage() {
  const [periods, setPeriods] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null); // period being edited
  const [editPrice, setEditPrice] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [error, setError] = useState('');
  const [matchResult, setMatchResult] = useState(null);

  async function load() {
    const data = await api.get('/admin/periods');
    setPeriods(data);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/periods', { ...form, price: form.price === '' ? null : parseFloat(form.price) });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  function startEdit(p) {
    setEditing(p.id);
    setEditPrice(p.price ?? '');
    setEditStatus(p.status);
  }

  async function saveEdit(id) {
    setError('');
    try {
      await api.patch(`/admin/periods/${id}`, {
        price: editPrice === '' ? null : parseFloat(editPrice),
        status: editStatus
      });
      setEditing(null);
      load();
    } catch (err) { setError(err.message); }
  }

  async function runMatch(id) {
    setError('');
    setMatchResult(null);
    try {
      const result = await api.post(`/admin/periods/${id}/match`, {});
      setMatchResult({ id, ...result });
      load();
    } catch (err) { setError(err.message); }
  }

  if (!periods) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--color-accent)', marginBottom: 8 }}>Administration</p>
          <h1 style={{ fontSize: 28 }}>Handelsperioder</h1>
        </div>
        <button className="btn btn-accent" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Avbryt' : '+ Ny period'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ padding: 24, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Skapa handelsperiod</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label>Namn</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Pris (kan sättas senare)</label>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="field">
              <label>Startdatum</label>
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div className="field">
              <label>Slutdatum</label>
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
            </div>
            <div className="field">
              <label>Handelspoststorlek</label>
              <input type="number" step="100" value={form.lot_size} onChange={e => setForm({ ...form, lot_size: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn btn-accent">Skapa period</button>
        </form>
      )}

      {error && (
        <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {matchResult && (
        <div style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
          Matchning klar: {matchResult.tradesCreated} affärer skapade, totalt {matchResult.totalQuantityMatched} aktier matchade.
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <table>
          <thead>
            <tr><th>Period</th><th>Start</th><th>Slut</th><th>Poststorlek</th><th>Pris</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {periods.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.start_date}</td>
                <td>{p.end_date}</td>
                <td className="mono">{p.lot_size}</td>
                <td className="mono">
                  {editing === p.id ? (
                    <input type="number" step="0.01" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: 90 }} />
                  ) : (p.price ?? '–')}
                </td>
                <td>
                  {editing === p.id ? (
                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                      <option value="upcoming">Kommande</option>
                      <option value="open">Öppen</option>
                      <option value="matching">Matchning pågår</option>
                      <option value="closed">Stängd</option>
                    </select>
                  ) : <StatusBadge status={p.status} />}
                </td>
                <td>
                  {editing === p.id ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-accent btn-sm" onClick={() => saveEdit(p.id)}>Spara</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Avbryt</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>Redigera</button>
                      {p.price && (p.status === 'open' || p.status === 'matching') && (
                        <button className="btn btn-primary btn-sm" onClick={() => runMatch(p.id)}>Matcha</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--color-ink-soft)', marginTop: 16 }}>
        Matchning körs enligt FIFO mot periodens fastställda pris. Redan matchade ordrar berörs inte av en ny matchningskörning.
      </p>
    </div>
  );
}
