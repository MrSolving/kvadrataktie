import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

const TYPE_LABELS = { kongress: 'Kongress', stamma: 'Bolagsstämma' };
const VOTE_LABELS = { ja: 'Ja', nej: 'Nej', avstar: 'Avstår' };
const VOTE_COLORS = { ja: 'var(--color-success)', nej: 'var(--color-danger)', avstar: 'var(--color-ink-soft)' };

function formatDateTime(d) {
  return new Date(d).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function VotingPage() {
  const [sessions, setSessions] = useState(null);
  const [openSessionId, setOpenSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [voting, setVoting] = useState({}); // motionId -> 'loading'|null
  const [error, setError] = useState('');

  async function loadList() {
    const data = await api.get('/voting');
    setSessions(data);
  }

  async function openSession(id) {
    setOpenSessionId(id);
    setSession(null);
    const data = await api.get(`/voting/${id}`);
    setSession(data);
  }

  useEffect(() => { loadList(); }, []);

  async function handleVote(sessionId, motionId, vote) {
    setError('');
    setVoting(v => ({ ...v, [motionId]: 'loading' }));
    try {
      await api.post(`/voting/${sessionId}/motions/${motionId}/vote`, { vote });
      const updated = await api.get(`/voting/${sessionId}`);
      setSession(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setVoting(v => ({ ...v, [motionId]: null }));
    }
  }

  if (!sessions) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-primary)', marginBottom: 8 }}>Demokrati</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Omröstningar</h1>

      {error && (
        <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="card" style={{ padding: 24 }}>
          <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>Inga omröstningar är schemalagda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map(s => (
            <div key={s.id} className="card" style={{ overflow: 'hidden' }}>
              <div
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => openSessionId === s.id ? setOpenSessionId(null) : openSession(s.id)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{s.title}</span>
                    <StatusBadge status={s.status} />
                    <span style={{ fontSize: 11.5, background: 'var(--color-line-soft)', borderRadius: 4, padding: '2px 7px' }}>
                      {TYPE_LABELS[s.type]}
                    </span>
                  </div>
                  <span style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>
                    {s.motion_count} {s.motion_count === 1 ? 'motion' : 'motioner'} · {s.voted_count} av {s.motion_count} röstade
                  </span>
                </div>
                <span style={{ fontSize: 18, color: 'var(--color-ink-soft)' }}>{openSessionId === s.id ? '▲' : '▼'}</span>
              </div>

              {openSessionId === s.id && (
                <div style={{ borderTop: '1px solid var(--color-line-soft)', padding: '20px 20px' }}>
                  {!session ? (
                    <div className="skeleton" style={{ height: 80 }} />
                  ) : (
                    <>
                      {session.description && (
                        <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', marginBottom: 20, maxWidth: 560 }}>
                          {session.description}
                        </p>
                      )}
                      {session.type === 'stamma' && (
                        <div style={{ fontSize: 12.5, color: 'var(--color-ink-soft)', marginBottom: 20, padding: '8px 12px', background: 'var(--color-primary-soft)', borderRadius: 6 }}>
                          Bolagsstämma: din rösträtt beräknas på antal aktier du äger vid röstnings­tillfället.
                        </div>
                      )}
                      {session.motions.length === 0 ? (
                        <p style={{ fontSize: 14, color: 'var(--color-ink-soft)' }}>Inga motioner har lagts till ännu.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {session.motions.map((m, i) => (
                            <MotionCard
                              key={m.id}
                              motion={m}
                              index={i + 1}
                              sessionOpen={session.status === 'open'}
                              loading={voting[m.id] === 'loading'}
                              onVote={vote => handleVote(session.id, m.id, vote)}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MotionCard({ motion, index, sessionOpen, loading, onVote }) {
  const myVote = motion.my_vote;

  return (
    <div style={{ padding: '16px 18px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-line-soft)' }}>
      <div style={{ fontSize: 12, color: 'var(--color-ink-soft)', marginBottom: 4 }}>Motion {index}</div>
      <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: motion.description ? 6 : 14 }}>{motion.title}</div>
      {motion.description && (
        <p style={{ fontSize: 13.5, color: 'var(--color-ink-soft)', marginBottom: 14, lineHeight: 1.5 }}>{motion.description}</p>
      )}

      {myVote && (
        <div style={{ fontSize: 12.5, color: VOTE_COLORS[myVote], marginBottom: 10, fontWeight: 500 }}>
          ✓ Du röstade: {VOTE_LABELS[myVote]}{motion.my_weight > 1 ? ` (${motion.my_weight} röster)` : ''}
        </div>
      )}

      {sessionOpen ? (
        <div style={{ display: 'flex', gap: 8 }}>
          {['ja', 'nej', 'avstar'].map(v => (
            <button
              key={v}
              disabled={loading}
              onClick={() => onVote(v)}
              className={myVote === v ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
              style={{
                borderColor: myVote === v ? undefined : 'var(--color-line)',
                color: myVote === v ? undefined : VOTE_COLORS[v],
                fontWeight: myVote === v ? 700 : 500
              }}
            >
              {VOTE_LABELS[v]}
            </button>
          ))}
        </div>
      ) : (
        !myVote && (
          <span style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>Omröstningen är stängd.</span>
        )
      )}
    </div>
  );
}
