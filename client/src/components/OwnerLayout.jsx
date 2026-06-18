import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/dashboard', label: 'Översikt' },
  { to: '/dashboard/order', label: 'Lägg order' },
  { to: '/dashboard/mina-ordrar', label: 'Mina ordrar' },
  { to: '/dashboard/affarer', label: 'Mina affärer' },
  { to: '/dashboard/orderdjup', label: 'Orderdjup' },
  { to: '/dashboard/omrostningar', label: 'Omröstningar' },
  { to: '/dashboard/kalender', label: 'Handelskalender' },
  { to: '/dashboard/nyheter', label: 'Nyheter' },
  { to: '/dashboard/profil', label: 'Mina uppgifter' },
];

export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <main style={{ flex: 1, padding: '36px 44px', maxWidth: 920 }}>
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
          <p style={{ fontSize: 12, color: 'var(--color-ink-soft)', margin: 0 }}>Aktiehandel</p>
        </div>

        <div style={{
          padding: '12px 14px', background: 'var(--color-primary-soft)',
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
              end={item.to === '/dashboard'}
              style={({ isActive }) => ({
                padding: '9px 12px',
                borderRadius: 6,
                fontSize: 13.5,
                fontWeight: 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-ink-soft)',
                background: isActive ? 'var(--color-primary-soft)' : 'transparent',
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
