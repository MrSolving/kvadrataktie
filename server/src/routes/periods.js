import express from 'express';
import { db } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const periods = db.prepare(`SELECT * FROM trading_periods ORDER BY start_date DESC`).all();
  res.json(periods);
});

router.get('/:id', (req, res) => {
  const period = db.prepare('SELECT * FROM trading_periods WHERE id = ?').get(req.params.id);
  if (!period) return res.status(404).json({ error: 'Handelsperiod hittades inte' });

  // Antal köp/sälj-ordrar i denna period (för ägare att se översikt)
  const buyCount = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE trading_period_id = ? AND type = 'buy' AND status != 'avbruten'`).get(period.id).c;
  const sellCount = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE trading_period_id = ? AND type = 'sell' AND status != 'avbruten'`).get(period.id).c;

  res.json({ ...period, buyOrderCount: buyCount, sellOrderCount: sellCount });
});

export default router;
