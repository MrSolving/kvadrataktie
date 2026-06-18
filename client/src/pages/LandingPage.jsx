import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '28px 48px',
        borderBottom: '1px solid var(--color-line-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>
            Kvadrat Aktiehandel
          </span>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ maxWidth: 920, width: '100%' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: 56,
            alignItems: 'start'
          }}
          className="landing-grid"
          >
            <div>
              <p className="eyebrow" style={{ color: 'var(--color-accent)', marginBottom: 14 }}>
                Intern aktiehandel · Hembudsaktier
              </p>
              <h1 style={{ fontSize: 42, lineHeight: 1.1, marginBottom: 20, maxWidth: 480 }}>
                Kvadrat Aktiehandel
              </h1>
              <p style={{ fontSize: 16.5, color: 'var(--color-ink-soft)', maxWidth: 460, marginBottom: 16 }}>
                Information om aktiehandel i bolag med hembudsaktier.
              </p>
              <p style={{ fontSize: 15, color: 'var(--color-ink-soft)', maxWidth: 460, lineHeight: 1.65 }}>
                Aktier i bolaget omfattas av hembudsrätt enligt bolagsordningen. Det innebär att aktier i
                första hand ska erbjudas befintliga aktieägare innan de kan överlåtas till någon utanför
                hembudskretsen. Handel sker under fastställda handelsperioder till ett pris som fastställs
                av styrelsen, och all matchning av köp- och säljordrar görs samlat efter att en handelsperiod
                stängt.
              </p>

              <div style={{ marginTop: 36, display: 'flex', gap: 28 }}>
                <Fact label="Handelsposter" value="Jämna 100-tal" />
                <Fact label="Prissättning" value="Fastställt per period" />
                <Fact label="Avveckling" value="Via Euroclear" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <LoginCard
                title="Aktieägare"
                description="Logga in för att se ditt innehav, lägga order och följa dina affärer."
                to="/login"
                tone="primary"
              />
              <LoginCard
                title="Administratör"
                description="Hantera ägare, handelsperioder, priser och Euroclear-rapportering."
                to="/admin/login"
                tone="accent"
              />
            </div>
          </div>
        </div>
      </main>

      <footer style={{ padding: '20px 48px', borderTop: '1px solid var(--color-line-soft)', fontSize: 12.5, color: 'var(--color-ink-soft)' }}>
        Kvadrat Aktiehandel — intern portal för aktiehandel i bolag med hembudsaktier.
      </footer>

      <style>{`
        @media (max-width: 760px) {
          .landing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function LoginCard({ title, description, to, tone }) {
  return (
    <Link to={to} className="card" style={{
      display: 'block',
      padding: 26,
      textDecoration: 'none',
      color: 'var(--color-ink)',
      transition: 'border-color 0.15s, transform 0.1s',
      borderColor: 'var(--color-line-soft)',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = tone === 'accent' ? 'var(--color-accent)' : 'var(--color-primary)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-line-soft)'}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: tone === 'accent' ? 'var(--color-accent-soft)' : 'var(--color-primary-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14
      }}>
        <div style={{
          width: 10, height: 10,
          background: tone === 'accent' ? 'var(--color-accent)' : 'var(--color-primary)',
        }} />
      </div>
      <h3 style={{ fontSize: 18, marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 13.5, color: 'var(--color-ink-soft)', margin: 0, lineHeight: 1.5 }}>{description}</p>
      <div style={{
        marginTop: 16, fontSize: 13, fontWeight: 600,
        color: tone === 'accent' ? 'var(--color-accent)' : 'var(--color-primary)'
      }}>
        Logga in →
      </div>
    </Link>
  );
}

function LogoMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect x="1" y="1" width="10.5" height="10.5" fill="var(--color-primary)" />
      <rect x="14.5" y="1" width="10.5" height="10.5" fill="var(--color-line)" />
      <rect x="1" y="14.5" width="10.5" height="10.5" fill="var(--color-line)" />
      <rect x="14.5" y="14.5" width="10.5" height="10.5" fill="var(--color-accent)" />
    </svg>
  );
}
