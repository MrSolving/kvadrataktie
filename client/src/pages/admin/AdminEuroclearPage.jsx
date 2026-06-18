import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

function formatDateTime(d) {
  return new Date(d).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminEuroclearPage() {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [exports, setExports] = useState(null);
  const [imports, setImports] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importPeriodId, setImportPeriodId] = useState('');
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciliationFor, setReconciliationFor] = useState(null);

  async function load() {
    const [p, ex, im] = await Promise.all([
      api.get('/admin/periods'),
      api.get('/admin/euroclear/exports'),
      api.get('/admin/euroclear/imports'),
    ]);
    setPeriods(p);
    setExports(ex);
    setImports(im);
    if (!selectedPeriodId && p.length > 0) setSelectedPeriodId(p[0].id);
    if (!importPeriodId && p.length > 0) setImportPeriodId(p[0].id);
  }

  useEffect(() => { load(); }, []);

  async function handleExport() {
    setError(''); setSuccessMsg('');
    try {
      const result = await api.post(`/admin/euroclear/export/${selectedPeriodId}`, {});
      setSuccessMsg(`Fil genererad: ${result.filename} (${result.tradeCount} affärer)`);
      load();
    } catch (err) { setError(err.message); }
  }

  function downloadExport(id) {
    window.open(`/api/admin/euroclear/exports/${id}/download`, '_blank');
  }

  async function handleImport(e) {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    if (!importFile) { setError('Välj en fil att importera'); return; }
    try {
      const text = await importFile.text();
      const result = await api.post('/admin/euroclear/import', {
        trading_period_id: importPeriodId,
        raw_content: text,
        filename: importFile.name
      });
      setSuccessMsg(`Import klar: ${result.rowsProcessed} rader inlästa`);
      setImportFile(null);
      load();
    } catch (err) { setError(err.message); }
  }

  async function viewReconciliation(importId) {
    setReconciliationFor(importId);
    const result = await api.get(`/admin/euroclear/imports/${importId}/reconciliation`);
    setReconciliation(result);
  }

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-accent)', marginBottom: 8 }}>Administration</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Euroclear</h1>

      {error && (
        <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)', padding: '10px 12px', borderRadius: 6, fontSize: 13.5, marginBottom: 16 }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>Skapa fil till Euroclear</h3>
          <p style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginBottom: 16 }}>
            Genererar en CSV-fil med alla genomförda, ej tidigare rapporterade affärer för perioden.
          </p>
          <div className="field">
            <label>Handelsperiod</label>
            <select value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button className="btn btn-accent" onClick={handleExport} disabled={!selectedPeriodId}>
            Generera Euroclear-fil
          </button>
        </div>

        <form onSubmit={handleImport} className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 15, marginBottom: 6 }}>Ta emot resultatfil från Euroclear</h3>
          <p style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginBottom: 16 }}>
            Format (CSV, semikolon): vp_konto;personnummer_orgnr;namn;antal
          </p>
          <div className="field">
            <label>Tillhörande period</label>
            <select value={importPeriodId} onChange={e => setImportPeriodId(e.target.value)}>
              {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Fil</label>
            <input type="file" accept=".csv,.txt" onChange={e => setImportFile(e.target.files[0])} />
          </div>
          <button type="submit" className="btn btn-accent">Importera fil</button>
        </form>
      </div>

      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Genererade exportfiler</h3>
      <div className="card" style={{ overflow: 'hidden', marginBottom: 28 }}>
        <table>
          <thead><tr><th>Filnamn</th><th>Genererad</th><th></th></tr></thead>
          <tbody>
            {(!exports || exports.length === 0) && (
              <tr><td colSpan={3} style={{ color: 'var(--color-ink-soft)' }}>Inga exportfiler ännu.</td></tr>
            )}
            {exports?.map(ex => (
              <tr key={ex.id}>
                <td className="mono" style={{ fontSize: 13 }}>{ex.filename}</td>
                <td style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>{formatDateTime(ex.generated_at)}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => downloadExport(ex.id)}>Ladda ner</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: 15, marginBottom: 12 }}>Mottagna importfiler och avstämning</h3>
      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <table>
          <thead><tr><th>Filnamn</th><th>Importerad</th><th></th></tr></thead>
          <tbody>
            {(!imports || imports.length === 0) && (
              <tr><td colSpan={3} style={{ color: 'var(--color-ink-soft)' }}>Inga importfiler ännu.</td></tr>
            )}
            {imports?.map(im => (
              <tr key={im.id}>
                <td className="mono" style={{ fontSize: 13 }}>{im.filename}</td>
                <td style={{ fontSize: 12.5, color: 'var(--color-ink-soft)' }}>{formatDateTime(im.imported_at)}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => viewReconciliation(im.id)}>Visa avstämning</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reconciliationFor && reconciliation && (
        <div>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>Avstämning mot aktieboken</h3>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table>
              <thead>
                <tr><th>VP-konto</th><th>Namn (Euroclear)</th><th>Antal (Euroclear)</th><th>Matchad ägare</th><th>Antal (system)</th><th>Avvikelse</th></tr>
              </thead>
              <tbody>
                {reconciliation.map(r => (
                  <tr key={r.id}>
                    <td className="mono">{r.vp_konto || '–'}</td>
                    <td>{r.name || '–'}</td>
                    <td className="mono">{r.quantity}</td>
                    <td>{r.system_name || <span style={{ color: 'var(--color-danger)' }}>Ej matchad</span>}</td>
                    <td className="mono">{r.matched_user_id ? (r.shares_company + r.shares_private) : '–'}</td>
                    <td className="mono">
                      {r.discrepancy === null || r.discrepancy === undefined ? '–' : (
                        <span className={`badge ${r.discrepancy === 0 ? 'badge-success' : 'badge-danger'}`}>
                          {r.discrepancy > 0 ? `+${r.discrepancy}` : r.discrepancy}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
