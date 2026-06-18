import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const emptyForm = { label: '', start_date: '', end_date: '', notes: '' };

export default function AdminCalendarPage() {
  const [calendar, setCalendar] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  async function load() {
    setCalendar(await api.get('/admin/calendar'));
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/calendar', form);
      setForm(emptyForm);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Ta bort denna kalenderpost?')) return;
    await api.delete(`/admin/calendar/${id}`);
    load();
  }

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-accent)', marginBottom: 8 }}>Administration</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Handelskalender</h1>

      <form onSubmit={handleCreate} className="card" style={{ padding: 24, marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Lägg till planerad period</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field">
            <label>Beskrivning</label>
            <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} required />
          </div>
          <div className="field">
            <label>Anteckning</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="field">
            <label>Startdatum</label>
            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
          </div>
          <div className="field">
            <label>Slutdatum</label>
            <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} required />
          </div>
        </div>
        {error && (
          <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
            {error}
          </div>
        )}
        <button type="submit" className="btn btn-accent">Lägg till</button>
      </form>

      {!calendar ? (
        <div className="skeleton" style={{ height: 140 }} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {calendar.map(c => (
            <div key={c.id} className="card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>{c.start_date} – {c.end_date}</div>
                {c.notes && <div style={{ fontSize: 12.5, color: 'var(--color-ink-soft)', marginTop: 4 }}>{c.notes}</div>}
              </div>
              <button className="btn btn-danger btn-sm" style={{ flexShrink: 0, height: 32 }} onClick={() => handleDelete(c.id)}>Ta bort</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
