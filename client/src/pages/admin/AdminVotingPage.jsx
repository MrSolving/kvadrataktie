import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import StatusBadge from '../../components/StatusBadge.jsx';

const TYPE_LABELS = { kongress: 'Kongress', stamma: 'Bolagsstämma' };
const VOTE_LABELS = { ja: 'Ja', nej: 'Nej', avstar: 'Avstår' };
const VOTE_COLORS = { ja: 'var(--color-success)', nej: 'var(--color-danger)', avstar: 'var(--color-ink-soft)' };
const emptyForm = { title: '', type: 'kongress', description: '' };
const emptyMotion = { title: '', description: '' };

export default function AdminVotingPage() {
  const [sessions, setSessions] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [openId, setOpenId] = useState(null);
  const [results, setResults] = useState(null);
  const [motionForm, setMotionForm] = useState(emptyMotion);
  const [showMotionForm, setShowMotionForm] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const data = await api.get('/admin/voting');
    setSessions(data);
  }

  async function loadResults(id) {
    setResults(null);
    const data = await api.get(`/admin/voting/${id}/results`);
    setResults(data);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (openId) loadResults(openId);
  }, [openId]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admin/voting', form);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleStatus(id, status) {
    setError('');
    try {
      await api.patch(`/admin/voting/${id}`, { status });
      load();
      if (openId === id) loadResults(id);
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Ta bort hela omröstningen och alla dess motioner och röster?')) return;
    try {
      await api.delete(`/admin/voting/${id}`);
      if (openId === id) setOpenId(null);
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleAddMotion(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/admin/voting/${openId}/motions`, motionForm);
      setMotionForm(emptyMotion);
      setShowMotionForm(false);
      loadResults(openId);
    } catch (err) { setError(err.message); }
  }

  async function handleDeleteMotion(motionId) {
    if (!confirm('Ta bort motionen och alla dess röster?')) return;
    try {
      await api.delete(`/admin/voting/${openId}/motions/${motionId}`);
      loadResults(openId);
    } catch (err) { setError(err.message); }
  }

  if (!sessions) return <div className="skeleton" style={{ height: 300 }} />;

  const openSession = results;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--color-accent)', marginBottom: 8 }}>Administration</p>
          <h1 style={{ fontSize: 28 }}>Omröstningar</h1>
        </div>
        <button className="btn btn-accent" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Avbryt' : '+ Ny omröstning'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ padding: 24, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Skapa omröstning</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field">
              <label>Titel</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="field">
              <label>Typ</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="kongress">Kongress (1 person = 1 röst)</option>
                <option value="stamma">Bolagsstämma (1 aktie = 1 röst)</option>
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>Beskrivning (valfri)</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn btn-accent">Skapa</button>
        </form>
      )}

      {error && (
        <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: openId ? '1fr 1fr' : '1fr', gap: 20 }}>
        {/* Sessionslista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions.length === 0 && (
            <div className="card" style={{ padding: 24 }}>
              <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>Inga omröstningar skapade ännu.</p>
            </div>
          )}
          {sessions.map(s => (
            <div
              key={s.id}
              className="card"
              style={{ padding: '14px 18px', cursor: 'pointer', border: openId === s.id ? '2px solid var(--color-accent)' : undefined }}
              onClick={() => setOpenId(openId === s.id ? null : s.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <StatusBadge status={s.status} />
                    <span style={{ fontSize: 11.5, background: 'var(--color-line-soft)', borderRadius: 4, padding: '2px 7px' }}>{TYPE_LABELS[s.type]}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>{s.motion_count} motioner · {s.voter_count} röstande</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {s.status === 'upcoming' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleStatus(s.id, 'open')}>Öppna</button>
                  )}
                  {s.status === 'open' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleStatus(s.id, 'closed')}>Stäng</button>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Ta bort</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detaljvy med resultat */}
        {openId && (
          <div>
            {!openSession ? (
              <div className="skeleton" style={{ height: 300 }} />
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, margin: 0 }}>{openSession.title}</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setShowMotionForm(s => !s); setMotionForm(emptyMotion); }}>
                    {showMotionForm ? 'Avbryt' : '+ Lägg till motion'}
                  </button>
                </div>

                {openSession.type === 'stamma' && (
                  <div style={{ fontSize: 12.5, marginBottom: 12, color: 'var(--color-ink-soft)' }}>
                    Totalt möjliga röster: <span className="mono" style={{ fontWeight: 600 }}>{openSession.totalEligible.toLocaleString('sv-SE')}</span>
                  </div>
                )}

                {showMotionForm && (
                  <form onSubmit={handleAddMotion} className="card" style={{ padding: 18, marginBottom: 16 }}>
                    <div className="field">
                      <label>Motionens titel</label>
                      <input value={motionForm.title} onChange={e => setMotionForm({ ...motionForm, title: e.target.value })} required />
                    </div>
                    <div className="field">
                      <label>Beskrivning (valfri)</label>
                      <input value={motionForm.description} onChange={e => setMotionForm({ ...motionForm, description: e.target.value })} />
                    </div>
                    <button type="submit" className="btn btn-accent btn-sm">Lägg till</button>
                  </form>
                )}

                {openSession.motions.length === 0 ? (
                  <div className="card" style={{ padding: 20 }}>
                    <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>Inga motioner ännu.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {openSession.motions.map((m, i) => (
                      <ResultCard
                        key={m.id}
                        motion={m}
                        index={i + 1}
                        sessionType={openSession.type}
                        totalEligible={openSession.totalEligible}
                        onDelete={() => handleDeleteMotion(m.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultBar({ label, count, weight, total, color }) {
  const pct = total > 0 ? Math.round((weight / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
        <span style={{ color, fontWeight: 500 }}>{label}</span>
        <span className="mono" style={{ color: 'var(--color-ink-soft)' }}>
          {weight.toLocaleString('sv-SE')} {count !== weight ? `(${count} ${count === 1 ? 'person' : 'personer'})` : ''} · {pct}%
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--color-line-soft)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .3s' }} />
      </div>
    </div>
  );
}

function ResultCard({ motion, index, sessionType, totalEligible, onDelete }) {
  const { result, totalVoters, totalWeight } = motion;
  const displayTotal = sessionType === 'stamma' ? totalEligible : totalEligible;
  const weightUnit = sessionType === 'stamma' ? 'röster (aktier)' : 'röster (personer)';

  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--color-ink-soft)', marginBottom: 2 }}>Motion {index}</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{motion.title}</div>
          {motion.description && (
            <div style={{ fontSize: 12.5, color: 'var(--color-ink-soft)', marginTop: 2 }}>{motion.description}</div>
          )}
        </div>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>Ta bort</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', marginBottom: 10 }}>
        {totalVoters} {totalVoters === 1 ? 'person' : 'personer'} har röstat
        {sessionType === 'stamma' && totalWeight !== totalVoters ? ` · ${totalWeight.toLocaleString('sv-SE')} ${weightUnit}` : ''}
        {displayTotal > 0 && ` · ${Math.round(totalWeight / displayTotal * 100)}% deltagande`}
      </div>

      {totalVoters === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-ink-soft)', margin: 0 }}>Inga röster inkomna ännu.</p>
      ) : (
        <>
          <ResultBar label="Ja" count={result.ja.voters} weight={result.ja.weight} total={totalWeight} color={VOTE_COLORS.ja} />
          <ResultBar label="Nej" count={result.nej.voters} weight={result.nej.weight} total={totalWeight} color={VOTE_COLORS.nej} />
          <ResultBar label="Avstår" count={result.avstar.voters} weight={result.avstar.weight} total={totalWeight} color={VOTE_COLORS.avstar} />
        </>
      )}
    </div>
  );
}
