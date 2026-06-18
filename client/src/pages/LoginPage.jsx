import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage({ variant = 'owner' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const isAdmin = variant === 'admin';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (isAdmin && user.role !== 'admin') {
        setError('Det här kontot har inte administratörsbehörighet.');
        return;
      }
      if (!isAdmin && user.role !== 'owner') {
        setError('Det här kontot är ett administratörskonto. Använd admin-inloggningen.');
        return;
      }
      navigate(isAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Link to="/" style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginBottom: 28, display: 'inline-block' }}>
          ← Till startsidan
        </Link>

        <div className="card" style={{ padding: 32 }}>
          <p className="eyebrow" style={{ color: isAdmin ? 'var(--color-accent)' : 'var(--color-primary)', marginBottom: 8 }}>
            {isAdmin ? 'Administratör' : 'Aktieägare'}
          </p>
          <h2 style={{ fontSize: 22, marginBottom: 24 }}>Logga in</h2>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-postadress</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="namn@exempel.se"
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="password">Lösenord</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--color-danger-soft)', color: 'var(--color-danger)',
                padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={isAdmin ? 'btn btn-accent' : 'btn btn-primary'}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 18px' }}
            >
              {loading ? 'Loggar in…' : 'Logga in'}
            </button>
          </form>
        </div>

        {!isAdmin && (
          <p style={{ fontSize: 12.5, color: 'var(--color-ink-soft)', textAlign: 'center', marginTop: 18 }}>
            Saknar du inloggning? Kontakta administratören för bolaget.
          </p>
        )}
      </div>
    </div>
  );
}
