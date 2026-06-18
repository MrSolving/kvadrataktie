import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';

function formatSek(value) {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value) + ' kr';
}
function formatDateTime(d) {
  if (!d) return null;
  return new Date(d).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function MyTradesPage() {
  const [tab, setTab] = useState('buyer');
  const [buyerTrades, setBuyerTrades] = useState(null);
  const [sellerTrades, setSellerTrades] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const [asBuyer, asSeller] = await Promise.all([
      api.get('/trades/as-buyer'),
      api.get('/trades/as-seller'),
    ]);
    setBuyerTrades(asBuyer);
    setSellerTrades(asSeller);
  }

  useEffect(() => { load(); }, []);

  async function markSent(id) {
    try {
      await api.post(`/trades/${id}/mark-payment-sent`, {});
      load();
    } catch (err) { setError(err.message); }
  }

  async function markReceived(id) {
    try {
      await api.post(`/trades/${id}/mark-payment-received`, {});
      load();
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-primary)', marginBottom: 8 }}>Affärer</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Mina affärer</h1>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--color-line-soft)' }}>
        <TabButton active={tab === 'buyer'} onClick={() => setTab('buyer')}>Som köpare</TabButton>
        <TabButton active={tab === 'seller'} onClick={() => setTab('seller')}>Som säljare</TabButton>
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {tab === 'buyer' ? (
        <BuyerTrades trades={buyerTrades} onMarkSent={markSent} />
      ) : (
        <SellerTrades trades={sellerTrades} onMarkReceived={markReceived} />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', padding: '10px 4px', marginRight: 20,
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
        color: active ? 'var(--color-primary)' : 'var(--color-ink-soft)',
        borderBottom: active ? '2px solid var(--color-primary)' : '2px solid transparent',
        marginBottom: -1
      }}
    >
      {children}
    </button>
  );
}

function BuyerTrades({ trades, onMarkSent }) {
  if (!trades) return <div className="skeleton" style={{ height: 160 }} />;
  if (trades.length === 0) {
    return <EmptyState text="Du har inga köpaffärer ännu." />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {trades.map(t => (
        <div key={t.id} className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.quantity} aktier från {t.seller_name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>{t.period_name} · {formatSek(t.price)} per aktie · totalt {formatSek(t.price * t.quantity)}</div>
            </div>
            <StatusBadge status={t.status} />
          </div>

          <div style={{ background: 'var(--color-primary-soft)', borderRadius: 6, padding: '12px 14px', marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Överför betalning till säljaren</div>
            <Row label="Säljare" value={t.seller_name} />
            <Row label="E-post" value={t.seller_email} />
            <Row label="Bankkonto för försäljning" value={t.seller_bankkonto || 'Ej registrerat – kontakta administratören'} mono />
            <Row label="Belopp att betala" value={formatSek(t.price * t.quantity)} mono />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: t.buyer_payment_sent ? 'default' : 'pointer', textTransform: 'none', fontWeight: 500, fontSize: 13.5, color: 'var(--color-ink)' }}>
            <input
              type="checkbox"
              checked={!!t.buyer_payment_sent}
              disabled={!!t.buyer_payment_sent}
              onChange={() => onMarkSent(t.id)}
              style={{ width: 16, height: 16 }}
            />
            {t.buyer_payment_sent
              ? `Pengar skickade ${formatDateTime(t.buyer_payment_sent_at)}`
              : 'Jag har skickat pengarna'}
          </label>

          <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--color-ink-soft)' }}>
            {t.seller_payment_received
              ? `Säljaren har bekräftat mottagen betalning ${formatDateTime(t.seller_payment_received_at)}`
              : 'Säljaren har ännu inte bekräftat mottagen betalning'}
          </div>
        </div>
      ))}
    </div>
  );
}

function SellerTrades({ trades, onMarkReceived }) {
  if (!trades) return <div className="skeleton" style={{ height: 160 }} />;
  if (trades.length === 0) {
    return <EmptyState text="Du har inga säljaffärer ännu." />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {trades.map(t => (
        <div key={t.id} className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.quantity} aktier till {t.buyer_name}</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>{t.period_name} · {formatSek(t.price)} per aktie · totalt {formatSek(t.price * t.quantity)}</div>
            </div>
            <StatusBadge status={t.status} />
          </div>

          <div style={{ background: 'var(--color-accent-soft)', borderRadius: 6, padding: '12px 14px', marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Köpare</div>
            <Row label="Köpare" value={t.buyer_name} />
            <Row label="E-post" value={t.buyer_email} />
            <Row label="Belopp att motta" value={formatSek(t.price * t.quantity)} mono />
          </div>

          <div style={{ marginBottom: 10, fontSize: 12.5, color: 'var(--color-ink-soft)' }}>
            {t.buyer_payment_sent
              ? `Köparen har markerat betalningen som skickad ${formatDateTime(t.buyer_payment_sent_at)}`
              : 'Köparen har ännu inte markerat betalningen som skickad'}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: t.seller_payment_received ? 'default' : 'pointer', textTransform: 'none', fontWeight: 500, fontSize: 13.5, color: 'var(--color-ink)' }}>
            <input
              type="checkbox"
              checked={!!t.seller_payment_received}
              disabled={!!t.seller_payment_received}
              onChange={() => onMarkReceived(t.id)}
              style={{ width: 16, height: 16 }}
            />
            {t.seller_payment_received
              ? `Betalning bekräftad mottagen ${formatDateTime(t.seller_payment_received_at)}`
              : 'Jag har mottagit betalningen'}
          </label>
        </div>
      ))}
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--color-ink-soft)' }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>{text}</p>
    </div>
  );
}
