import express from 'express';
import { db } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired);

// Dashboard-data för inloggad ägare
router.get('/dashboard', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Användare hittades inte' });

  const nextPeriod = db.prepare(`
    SELECT * FROM trading_periods WHERE status IN ('open', 'upcoming')
    ORDER BY start_date ASC LIMIT 1
  `).get();

  const latestClosedPeriod = db.prepare(`
    SELECT * FROM trading_periods WHERE price IS NOT NULL
    ORDER BY start_date DESC LIMIT 1
  `).get();

  const totalShares = user.shares_company + user.shares_private;
  const latestPrice = latestClosedPeriod?.price || 0;
  const portfolioValue = totalShares * latestPrice;

  let myBuyOrders = 0, mySellOrders = 0;
  if (nextPeriod) {
    myBuyOrders = db.prepare(`
      SELECT COUNT(*) as c FROM orders WHERE user_id = ? AND trading_period_id = ? AND type = 'buy' AND status != 'avbruten'
    `).get(user.id, nextPeriod.id).c;
    mySellOrders = db.prepare(`
      SELECT COUNT(*) as c FROM orders WHERE user_id = ? AND trading_period_id = ? AND type = 'sell' AND status != 'avbruten'
    `).get(user.id, nextPeriod.id).c;
  }

  const upcomingCalendar = db.prepare(`
    SELECT * FROM trading_calendar ORDER BY start_date ASC LIMIT 10
  `).all();

  const news = db.prepare(`SELECT * FROM news ORDER BY published_at DESC LIMIT 5`).all();

  res.json({
    user: {
      name: user.name,
      email: user.email,
      vp_konto: user.vp_konto,
      bankkonto_forsaljning: user.bankkonto_forsaljning,
      personnummer_orgnr: user.personnummer_orgnr,
      shares_company: user.shares_company,
      shares_private: user.shares_private,
      total_shares: totalShares
    },
    nextPeriod,
    latestPrice,
    portfolioValue,
    myBuyOrders,
    mySellOrders,
    upcomingCalendar,
    news
  });
});

export default router;
