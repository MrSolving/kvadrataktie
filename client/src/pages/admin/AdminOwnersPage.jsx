import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

const emptyForm = {
  email: '', name: '', password: '', personnummer_orgnr: '',
  vp_konto: '', bankkonto_forsaljning: '', shares_company: 0, shares_private: 0,
  in_hembudskrets: true
};

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

  async function load() {
    const data = await api.get('/admin/owners');
    setOwners(data);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/admin/owners', form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!owners) return <div className="skeleton" style={{ height: 300 }} />;

  const filtered = owners.filter(o => {
    if (filter === 'hembud') return o.in_hembudskrets;
    if (filter === 'utanfor') return !o.in_hembudskrets;
    return true;
  });

  const totalShares = owners.reduce((sum, o) => sum + o.shares_company + o.shares_private, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--color-accent)', marginBottom: 8 }}>Administration</p>
          <h1 style={{ fontSize: 28 }}>Ägare</h1>
        </div>
        <button className="btn btn-accent" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Avbryt' : '+ Ny ägare'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ padding: 24, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Skapa ny ägare och inloggning</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <TextField label="Namn" value={form.name} onChange={v => setForm({ ...form, name: v })} required />
            <TextField label="E-postadress" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} required />
            <TextField label="Tillfälligt lösenord" type="text" value={form.password} onChange={v => setForm({ ...form, password: v })} required />
            <TextField label="Person-/organisationsnummer" value={form.personnummer_orgnr} onChange={v => setForm({ ...form, personnummer_orgnr: v })} />
            <TextField label="VP-konto" value={form.vp_konto} onChange={v => setForm({ ...form, vp_konto: v })} />
            <TextField label="Bankkonto vid försäljning" value={form.bankkonto_forsaljning} onChange={v => setForm({ ...form, bankkonto_forsaljning: v })} />
            <TextField label="Aktieinnehav, bolag" type="number" value={form.shares_company} onChange={v => setForm({ ...form, shares_company: v })} />
            <TextField label="Aktieinnehav, privat" type="number" value={form.shares_private} onChange={v => setForm({ ...form, shares_private: v })} />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 20, textTransform: 'none', fontWeight: 500, fontSize: 13.5 }}>
            <input
              type="checkbox"
              checked={form.in_hembudskrets}
              onChange={e => setForm({ ...form, in_hembudskrets: e.target.checked })}
              style={{ width: 16, height: 16 }}
            />
            Omfattas av hembudsrätt
          </label>

          {error && (
            <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn btn-accent">
            {submitting ? 'Skapar…' : 'Skapa ägare'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>Alla ({owners.length})</FilterButton>
        <FilterButton active={filter === 'hembud'} onClick={() => setFilter('hembud')}>
          Hembudskrets ({owners.filter(o => o.in_hembudskrets).length})
        </FilterButton>
        <FilterButton active={filter === 'utanfor'} onClick={() => setFilter('utanfor')}>
          Utanför hembudskrets ({owners.filter(o => !o.in_hembudskrets).length})
        </FilterButton>
      </div>

      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Namn</th><th>E-post</th><th>VP-konto</th><th>Innehav bolag</th><th>Innehav privat</th><th>Totalt</th><th>Hembudskrets</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td style={{ fontSize: 12.5 }}>{o.email}</td>
                <td className="mono">{o.vp_konto || '–'}</td>
                <td className="mono">{o.shares_company.toLocaleString('sv-SE')}</td>
                <td className="mono">{o.shares_private.toLocaleString('sv-SE')}</td>
                <td className="mono" style={{ fontWeight: 600 }}>{(o.shares_company + o.shares_private).toLocaleString('sv-SE')}</td>
                <td>
                  <span className={`badge ${o.in_hembudskrets ? 'badge-success' : 'badge-neutral'}`}>
                    {o.in_hembudskrets ? 'Ja' : 'Nej'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
        Totalt registrerat aktieinnehav: <span className="mono" style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{totalShares.toLocaleString('sv-SE')} st</span>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', required }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} />
    </div>
  );
}

function FilterButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={active ? 'btn btn-ghost btn-sm' : 'btn btn-ghost btn-sm'}
      style={{
        borderColor: active ? 'var(--color-accent)' : 'var(--color-line)',
        color: active ? 'var(--color-accent)' : 'var(--color-ink-soft)'
      }}
    >
      {children}
    </button>
  );
}
