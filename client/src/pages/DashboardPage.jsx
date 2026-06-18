import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';

function formatSek(value) {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value) + ' kr';
}

function formatDate(d) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/portfolio/dashboard').then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <p style={{ color: 'var(--color-danger)' }}>{error}</p>;
  if (!data) return <DashboardSkeleton />;

  const { user, nextPeriod, latestPrice, portfolioValue, myBuyOrders, mySellOrders, upcomingCalendar, news } = data;

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-primary)', marginBottom: 8 }}>Översikt</p>
      <h1 style={{ fontSize: 28, marginBottom: 32 }}>Hej, {user.name.split(' ')[0]}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatCard label="Totalt aktieinnehav" value={`${user.total_shares.toLocaleString('sv-SE')} st`} sub={`Bolag: ${user.shares_company} · Privat: ${user.shares_private}`} />
        <StatCard label="Värde enligt senaste handelspris" value={formatSek(portfolioValue)} sub={`á ${formatSek(latestPrice)} per aktie`} />
        <StatCard
          label="Nästa handelsperiod"
          value={nextPeriod ? nextPeriod.name : 'Ingen planerad'}
          sub={nextPeriod ? `${formatDate(nextPeriod.start_date)} – ${formatDate(nextPeriod.end_date)}` : ''}
        />
      </div>

      {nextPeriod && nextPeriod.status === 'open' && (
        <div className="card" style={{ padding: 20, marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{nextPeriod.name} är öppen för orderläggning</div>
            <div style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>
              Fastställt pris: <span className="mono">{formatSek(nextPeriod.price)}</span> · Du har {myBuyOrders} köpordrar och {mySellOrders} säljordrar i denna period
            </div>
          </div>
          <Link to="/dashboard/order" className="btn btn-primary">Lägg order</Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <InfoBlock title="Mina uppgifter">
          <Row label="VP-konto" value={user.vp_konto || '–'} mono />
          <Row label="Konto vid försäljning" value={user.bankkonto_forsaljning || '–'} mono />
          <Row label="E-postadress" value={user.email} />
          <Row label="Person-/organisationsnummer" value={user.personnummer_orgnr || '–'} mono />
        </InfoBlock>

        <InfoBlock title="Kommande handelskalender">
          {upcomingCalendar.length === 0 && <p style={{ fontSize: 13.5, color: 'var(--color-ink-soft)' }}>Inga planerade perioder ännu.</p>}
          {upcomingCalendar.map(c => (
            <div key={c.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>{formatDate(c.start_date)} – {formatDate(c.end_date)}</div>
            </div>
          ))}
        </InfoBlock>
      </div>

      <InfoBlock title="Senaste nyheter">
        {news.length === 0 && <p style={{ fontSize: 13.5, color: 'var(--color-ink-soft)' }}>Inga nyheter publicerade ännu.</p>}
        {news.map(n => (
          <div key={n.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--color-line-soft)' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.title}</div>
            <div style={{ fontSize: 13.5, color: 'var(--color-ink-soft)', marginBottom: 4 }}>{n.body}</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-ink-soft)' }}>{formatDate(n.published_at)}</div>
          </div>
        ))}
      </InfoBlock>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 21, fontWeight: 500, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>{sub}</div>}
    </div>
  );
}

function InfoBlock({ title, children }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 15, marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-line-soft)' }}>
      <span style={{ fontSize: 13, color: 'var(--color-ink-soft)' }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ width: 180, height: 16, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: 280, height: 28, marginBottom: 32 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 90 }} />)}
      </div>
    </div>
  );
}
