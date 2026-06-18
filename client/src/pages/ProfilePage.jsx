import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function ProfilePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.get('/portfolio/dashboard').then(d => setUser(d.user));
  }, []);

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--color-primary)', marginBottom: 8 }}>Konto</p>
      <h1 style={{ fontSize: 28, marginBottom: 24 }}>Mina uppgifter</h1>

      {!user ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : (
        <div className="card" style={{ padding: 28, maxWidth: 480 }}>
          <Field label="Namn" value={user.name} />
          <Field label="E-postadress" value={user.email} />
          <Field label="Person-/organisationsnummer" value={user.personnummer_orgnr || '–'} mono />
          <Field label="Registrerat VP-konto" value={user.vp_konto || '–'} mono />
          <Field label="Kontonummer vid försäljning" value={user.bankkonto_forsaljning || '–'} mono />
          <Field label="Aktieinnehav, bolag" value={`${user.shares_company.toLocaleString('sv-SE')} st`} mono />
          <Field label="Aktieinnehav, privat" value={`${user.shares_private.toLocaleString('sv-SE')} st`} mono last />

          <p style={{ fontSize: 12.5, color: 'var(--color-ink-soft)', marginTop: 20, marginBottom: 0 }}>
            För att ändra dina kontouppgifter, kontakta administratören för bolaget.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '12px 0',
      borderBottom: last ? 'none' : '1px solid var(--color-line-soft)'
    }}>
      <span style={{ fontSize: 13.5, color: 'var(--color-ink-soft)' }}>{label}</span>
      <span className={mono ? 'mono' : ''} style={{ fontSize: 13.5, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
