import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function formatSek(value) {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value) + ' kr';
}

export default function PlaceOrderPage() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [type, setType] = useState('buy');
  const [shareType, setShareType] = useState('privat');
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/periods').then(list => {
      setPeriods(list);
      const open = list.find(p => p.status === 'open');
      if (open) setSelectedPeriodId(open.id);
    });
  }, []);

  const openPeriods = periods.filter(p => p.status === 'open');
  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  const sharesPrivat = user?.shares_private ?? 0;
  const sharesForetag = user?.shares_company ?? 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post('/orders', {
        trading_period_id: selectedPeriodId,
        type,
        quantity: parseInt(quantity, 10),
        ...(type === 'sell' ? { share_type: shareType } : {})
      });
      setMessage({ tone: 'success', text: 'Order registrerad.' });
      setQuantity('');
    } catch (err) {
      setMessage({ tone: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-primary)', marginBottom: 8 }}>Order</p>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Lägg order</h1>
      <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', marginBottom: 32, maxWidth: 480 }}>
        Order läggs till handelsperiodens fastställda pris och kvantitet måste anges i jämna 100-tal.
        Matchning mellan köpare och säljare görs av administratören när perioden stänger.
      </p>

      {openPeriods.length === 0 ? (
        <div className="card" style={{ padding: 24, maxWidth: 480 }}>
          <p style={{ fontSize: 14, color: 'var(--color-ink-soft)', margin: 0 }}>
            Det finns ingen öppen handelsperiod just nu. Se handelskalendern för kommande perioder.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card" style={{ padding: 28, maxWidth: 480 }}>
          <div className="field">
            <label>Handelsperiod</label>
            <select value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
              {openPeriods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedPeriod && (
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              background: 'var(--color-primary-soft)', padding: '10px 14px',
              borderRadius: 6, marginBottom: 20, fontSize: 13
            }}>
              <span>Fastställt pris</span>
              <span className="mono" style={{ fontWeight: 600 }}>{formatSek(selectedPeriod.price)}</span>
            </div>
          )}

          <div className="field">
            <label>Ordertyp</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setType('buy')}
                className={type === 'buy' ? 'btn btn-primary' : 'btn btn-ghost'}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Köp
              </button>
              <button
                type="button"
                onClick={() => setType('sell')}
                className={type === 'sell' ? 'btn btn-accent' : 'btn btn-ghost'}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Sälj
              </button>
            </div>
          </div>

          {type === 'sell' && (
            <div className="field">
              <label>Aktier att sälja</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShareType('privat')}
                  className={shareType === 'privat' ? 'btn btn-accent' : 'btn btn-ghost'}
                  style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 2, paddingTop: 10, paddingBottom: 10 }}
                >
                  <span>Privata</span>
                  <span className="mono" style={{ fontSize: 12, opacity: 0.8 }}>{sharesPrivat} st</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShareType('foretag')}
                  className={shareType === 'foretag' ? 'btn btn-accent' : 'btn btn-ghost'}
                  style={{ flex: 1, justifyContent: 'center', flexDirection: 'column', gap: 2, paddingTop: 10, paddingBottom: 10 }}
                >
                  <span>Företagets</span>
                  <span className="mono" style={{ fontSize: 12, opacity: 0.8 }}>{sharesForetag} st</span>
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--color-ink-soft)', marginTop: 6 }}>
                Tillgängligt: <span className="mono">{shareType === 'privat' ? sharesPrivat : sharesForetag} st</span>
              </p>
            </div>
          )}

          <div className="field">
            <label htmlFor="quantity">Antal aktier (jämna 100-tal)</label>
            <input
              id="quantity"
              type="number"
              step="100"
              min="100"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="t.ex. 200"
              required
            />
          </div>

          {message && (
            <div style={{
              background: message.tone === 'success' ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
              color: message.tone === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16
            }}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={type === 'buy' ? 'btn btn-primary' : 'btn btn-accent'}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {submitting ? 'Registrerar…' : `Lägg ${type === 'buy' ? 'köp' : 'sälj'}order`}
          </button>
        </form>
      )}
    </div>
  );
}
