import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db } from '../db/index.js';
import { authRequired, adminRequired } from '../middleware/auth.js';
import { matchTradingPeriod } from '../services/matching.js';
import { generateEuroclearFile, importEuroclearFile, getReconciliation } from '../services/euroclear.js';

const router = express.Router();
router.use(authRequired, adminRequired);

// --- Ägare ---

router.get('/owners', (req, res) => {
  const owners = db.prepare(`
    SELECT id, email, name, personnummer_orgnr, vp_konto, bankkonto_forsaljning,
           shares_company, shares_private, in_hembudskrets, created_at
    FROM users WHERE role = 'owner'
    ORDER BY name ASC
  `).all();
  res.json(owners);
});

router.post('/owners', (req, res) => {
  const { email, name, password, personnummer_orgnr, vp_konto, bankkonto_forsaljning, shares_company, shares_private, in_hembudskrets } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'email, name och password krävs' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'E-postadressen är redan registrerad' });

  const id = uuid();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, role, name, personnummer_orgnr, vp_konto, bankkonto_forsaljning, shares_company, shares_private, in_hembudskrets)
    VALUES (?, ?, ?, 'owner', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, email.toLowerCase().trim(), bcrypt.hashSync(password, 10), name,
    personnummer_orgnr || null, vp_konto || null, bankkonto_forsaljning || null,
    parseInt(shares_company, 10) || 0, parseInt(shares_private, 10) || 0,
    in_hembudskrets === false || in_hembudskrets === 0 ? 0 : 1
  );

  const created = db.prepare('SELECT id, email, name, personnummer_orgnr, vp_konto, bankkonto_forsaljning, shares_company, shares_private, in_hembudskrets FROM users WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.patch('/owners/:id', (req, res) => {
  const owner = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(req.params.id, 'owner');
  if (!owner) return res.status(404).json({ error: 'Ägare hittades inte' });

  const fields = ['name', 'personnummer_orgnr', 'vp_konto', 'bankkonto_forsaljning', 'shares_company', 'shares_private', 'in_hembudskrets'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'shares_company' || f === 'shares_private' ? parseInt(req.body[f], 10) : (f === 'in_hembudskrets' ? (req.body[f] ? 1 : 0) : req.body[f]));
    }
  }
  if (req.body.password) {
    updates.push('password_hash = ?');
    values.push(bcrypt.hashSync(req.body.password, 10));
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Inga fält att uppdatera' });

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values, owner.id);
  const updated = db.prepare('SELECT id, email, name, personnummer_orgnr, vp_konto, bankkonto_forsaljning, shares_company, shares_private, in_hembudskrets FROM users WHERE id = ?').get(owner.id);
  res.json(updated);
});

// --- Handelsperioder ---

router.get('/periods', (req, res) => {
  const periods = db.prepare('SELECT * FROM trading_periods ORDER BY start_date DESC').all();
  res.json(periods);
});

router.post('/periods', (req, res) => {
  const { name, start_date, end_date, price, lot_size } = req.body;
  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: 'name, start_date och end_date krävs' });
  }
  const id = uuid();
  db.prepare(`
    INSERT INTO trading_periods (id, name, start_date, end_date, price, lot_size, status)
    VALUES (?, ?, ?, ?, ?, ?, 'upcoming')
  `).run(id, name, start_date, end_date, price ?? null, lot_size || 100);
  const created = db.prepare('SELECT * FROM trading_periods WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.patch('/periods/:id', (req, res) => {
  const period = db.prepare('SELECT * FROM trading_periods WHERE id = ?').get(req.params.id);
  if (!period) return res.status(404).json({ error: 'Handelsperiod hittades inte' });

  const fields = ['name', 'start_date', 'end_date', 'price', 'lot_size', 'status'];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Inga fält att uppdatera' });

  db.prepare(`UPDATE trading_periods SET ${updates.join(', ')} WHERE id = ?`).run(...values, period.id);
  const updated = db.prepare('SELECT * FROM trading_periods WHERE id = ?').get(period.id);
  res.json(updated);
});

// Kör matchning för en period
router.post('/periods/:id/match', (req, res) => {
  try {
    const result = matchTradingPeriod(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Pågående aktiehändelser (översikt) ---

router.get('/activity', (req, res) => {
  const openPeriods = db.prepare(`SELECT * FROM trading_periods WHERE status IN ('open','matching')`).all();
  const recentOrders = db.prepare(`
    SELECT o.*, u.name as user_name, tp.name as period_name
    FROM orders o JOIN users u ON u.id = o.user_id JOIN trading_periods tp ON tp.id = o.trading_period_id
    ORDER BY o.created_at DESC LIMIT 20
  `).all();
  const recentTrades = db.prepare(`
    SELECT t.*, b.name as buyer_name, s.name as seller_name
    FROM trades t JOIN users b ON b.id = t.buyer_id JOIN users s ON s.id = t.seller_id
    ORDER BY t.created_at DESC LIMIT 20
  `).all();
  res.json({ openPeriods, recentOrders, recentTrades });
});

// --- Nyheter ---

router.post('/news', (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title och body krävs' });
  const id = uuid();
  db.prepare(`INSERT INTO news (id, title, body, author_id) VALUES (?, ?, ?, ?)`).run(id, title, body, req.user.id);
  const created = db.prepare('SELECT * FROM news WHERE id = ?').get(id);
  res.status(201).json(created);
});

router.get('/news', (req, res) => {
  res.json(db.prepare('SELECT * FROM news ORDER BY published_at DESC').all());
});

router.delete('/news/:id', (req, res) => {
  db.prepare('DELETE FROM news WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Handelskalender ---

router.get('/calendar', (req, res) => {
  res.json(db.prepare('SELECT * FROM trading_calendar ORDER BY start_date ASC').all());
});

router.post('/calendar', (req, res) => {
  const { label, start_date, end_date, notes } = req.body;
  if (!label || !start_date || !end_date) return res.status(400).json({ error: 'label, start_date, end_date krävs' });
  const id = uuid();
  db.prepare(`INSERT INTO trading_calendar (id, label, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?)`)
    .run(id, label, start_date, end_date, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM trading_calendar WHERE id = ?').get(id));
});

router.delete('/calendar/:id', (req, res) => {
  db.prepare('DELETE FROM trading_calendar WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// --- Omröstningar ---

router.get('/voting', (req, res) => {
  const sessions = db.prepare(`
    SELECT vs.*,
      (SELECT COUNT(*) FROM motions WHERE session_id = vs.id) as motion_count,
      (SELECT COUNT(DISTINCT user_id) FROM votes v JOIN motions m ON m.id = v.motion_id WHERE m.session_id = vs.id) as voter_count
    FROM voting_sessions vs
    ORDER BY vs.created_at DESC
  `).all();
  res.json(sessions);
});

router.post('/voting', (req, res) => {
  const { title, type, description } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'title och type krävs' });
  if (!['kongress', 'stamma'].includes(type)) return res.status(400).json({ error: 'type måste vara kongress eller stamma' });
  const id = uuid();
  db.prepare(`INSERT INTO voting_sessions (id, title, type, description, created_by) VALUES (?, ?, ?, ?, ?)`)
    .run(id, title, type, description || null, req.user.id);
  res.status(201).json(db.prepare('SELECT * FROM voting_sessions WHERE id = ?').get(id));
});

router.patch('/voting/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM voting_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Omröstning hittades inte' });
  const { status, title, description } = req.body;
  const updates = [];
  const values = [];
  if (status) { updates.push('status = ?'); values.push(status); }
  if (title) { updates.push('title = ?'); values.push(title); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (updates.length === 0) return res.status(400).json({ error: 'Inga fält att uppdatera' });
  db.prepare(`UPDATE voting_sessions SET ${updates.join(', ')} WHERE id = ?`).run(...values, session.id);
  res.json(db.prepare('SELECT * FROM voting_sessions WHERE id = ?').get(session.id));
});

router.delete('/voting/:id', (req, res) => {
  db.prepare('DELETE FROM voting_sessions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Motioner
router.post('/voting/:id/motions', (req, res) => {
  const session = db.prepare('SELECT * FROM voting_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Omröstning hittades inte' });
  const { title, description, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'title krävs' });
  const id = uuid();
  db.prepare(`INSERT INTO motions (id, session_id, title, description, sort_order) VALUES (?, ?, ?, ?, ?)`)
    .run(id, session.id, title, description || null, sort_order ?? 0);
  res.status(201).json(db.prepare('SELECT * FROM motions WHERE id = ?').get(id));
});

router.delete('/voting/:sessionId/motions/:motionId', (req, res) => {
  db.prepare('DELETE FROM motions WHERE id = ? AND session_id = ?').run(req.params.motionId, req.params.sessionId);
  res.json({ ok: true });
});

// Resultat per session (alla motioner med röstresultat)
router.get('/voting/:id/results', (req, res) => {
  const session = db.prepare('SELECT * FROM voting_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Omröstning hittades inte' });

  const motions = db.prepare(`SELECT * FROM motions WHERE session_id = ? ORDER BY sort_order ASC, created_at ASC`).all(session.id);

  const totalEligible = session.type === 'kongress'
    ? db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'owner'`).get().c
    : db.prepare(`SELECT COALESCE(SUM(shares_company + shares_private), 0) as c FROM users WHERE role = 'owner'`).get().c;

  const motionsWithResults = motions.map(m => {
    const tally = db.prepare(`
      SELECT vote,
        COUNT(*) as voter_count,
        COALESCE(SUM(vote_weight), 0) as weighted_total
      FROM votes WHERE motion_id = ?
      GROUP BY vote
    `).all(m.id);

    const result = { ja: { voters: 0, weight: 0 }, nej: { voters: 0, weight: 0 }, avstar: { voters: 0, weight: 0 } };
    for (const row of tally) {
      result[row.vote] = { voters: row.voter_count, weight: row.weighted_total };
    }
    const totalVoters = tally.reduce((s, r) => s + r.voter_count, 0);
    const totalWeight = tally.reduce((s, r) => s + r.weighted_total, 0);

    return { ...m, result, totalVoters, totalWeight, totalEligible };
  });

  res.json({ ...session, motions: motionsWithResults, totalEligible });
});

// --- Euroclear ---

router.post('/euroclear/export/:periodId', (req, res) => {
  try {
    const result = generateEuroclearFile(req.params.periodId, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/euroclear/exports', (req, res) => {
  const exports = db.prepare(`
    SELECT id, trading_period_id, generated_at, filename FROM euroclear_exports ORDER BY generated_at DESC
  `).all();
  res.json(exports);
});

router.get('/euroclear/exports/:id/download', (req, res) => {
  const exp = db.prepare('SELECT * FROM euroclear_exports WHERE id = ?').get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Fil hittades inte' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${exp.filename}"`);
  res.send(exp.file_content);
});

router.post('/euroclear/import', (req, res) => {
  const { trading_period_id, raw_content, filename } = req.body;
  if (!raw_content) return res.status(400).json({ error: 'raw_content krävs' });
  try {
    const result = importEuroclearFile(trading_period_id, raw_content, req.user.id, filename);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/euroclear/imports', (req, res) => {
  const imports = db.prepare(`
    SELECT id, trading_period_id, imported_at, filename FROM euroclear_imports ORDER BY imported_at DESC
  `).all();
  res.json(imports);
});

router.get('/euroclear/imports/:id/reconciliation', (req, res) => {
  const result = getReconciliation(req.params.id);
  res.json(result);
});

export default router;
