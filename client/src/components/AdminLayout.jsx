import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/admin', label: 'Översikt' },
  { to: '/admin/agare', label: 'Ägare' },
  { to: '/admin/perioder', label: 'Handelsperioder' },
  { to: '/admin/handelsposter', label: 'Handelsposter' },
  { to: '/admin/nyheter', label: 'Nyheter' },
  { to: '/admin/kalender', label: 'Handelskalender' },
  { to: '/admin/euroclear', label: 'Euroclear' },
  { to: '/admin/omrostningar', label: 'Omröstningar' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <main style={{ flex: 1, padding: '36px 44px', maxWidth: 1080 }}>
        <Outlet />
      </main>

      <aside style={{
        width: 248,
        borderLeft: '1px solid var(--color-line-soft)',
        background: 'var(--color-surface)',
        padding: '28px 22px',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh'
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <LogoMark />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>
              Kvadrat
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-ink-soft)', margin: 0 }}>Administration</p>
        </div>

        <div style={{
          padding: '12px 14px', background: 'var(--color-accent-soft)',
          borderRadius: 8, marginBottom: 24
        }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--color-ink-soft)' }}>{user?.email}</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              style={({ isActive }) => ({
                padding: '9px 12px',
                borderRadius: 6,
                fontSize: 13.5,
                fontWeight: 500,
                color: isActive ? 'var(--color-accent)' : 'var(--color-ink-soft)',
                background: isActive ? 'var(--color-accent-soft)' : 'transparent',
                textDecoration: 'none'
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ justifyContent: 'center' }}>
          Logga ut
        </button>
      </aside>
    </div>
  );
}

function LogoMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 26 26" fill="none">
      <rect x="1" y="1" width="10.5" height="10.5" fill="var(--color-primary)" />
      <rect x="14.5" y="1" width="10.5" height="10.5" fill="var(--color-line)" />
      <rect x="1" y="14.5" width="10.5" height="10.5" fill="var(--color-line)" />
      <rect x="14.5" y="14.5" width="10.5" height="10.5" fill="var(--color-accent)" />
    </svg>
  );
}
