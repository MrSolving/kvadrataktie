import express from 'express';
import { db } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.use(authRequired);

// Mina affärer som köpare - inkl. säljarens info för betalning
router.get('/as-buyer', (req, res) => {
  const trades = db.prepare(`
    SELECT t.*, 
           s.name as seller_name, s.bankkonto_forsaljning as seller_bankkonto, s.email as seller_email,
           tp.name as period_name
    FROM trades t
    JOIN users s ON s.id = t.seller_id
    JOIN trading_periods tp ON tp.id = t.trading_period_id
    WHERE t.buyer_id = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id);
  res.json(trades);
});

// Mina affärer som säljare - inkl. köparens info
router.get('/as-seller', (req, res) => {
  const trades = db.prepare(`
    SELECT t.*, 
           b.name as buyer_name, b.email as buyer_email,
           tp.name as period_name
    FROM trades t
    JOIN users b ON b.id = t.buyer_id
    JOIN trading_periods tp ON tp.id = t.trading_period_id
    WHERE t.seller_id = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id);
  res.json(trades);
});

// Köpare markerar att pengar är skickade
router.post('/:id/mark-payment-sent', (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Affär hittades inte' });
  if (trade.buyer_id !== req.user.id) return res.status(403).json({ error: 'Endast köparen kan markera detta' });

  db.prepare(`
    UPDATE trades SET buyer_payment_sent = 1, buyer_payment_sent_at = datetime('now', 'localtime') WHERE id = ?
  `).run(trade.id);

  maybeAdvanceStatus(trade.id);
  const updated = db.prepare('SELECT * FROM trades WHERE id = ?').get(trade.id);
  res.json(updated);
});

// Säljare markerar att pengar är mottagna
router.post('/:id/mark-payment-received', (req, res) => {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Affär hittades inte' });
  if (trade.seller_id !== req.user.id) return res.status(403).json({ error: 'Endast säljaren kan markera detta' });

  db.prepare(`
    UPDATE trades SET seller_payment_received = 1, seller_payment_received_at = datetime('now', 'localtime') WHERE id = ?
  `).run(trade.id);

  maybeAdvanceStatus(trade.id);
  const updated = db.prepare('SELECT * FROM trades WHERE id = ?').get(trade.id);
  res.json(updated);
});

function maybeAdvanceStatus(tradeId) {
  const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(tradeId);
  if (trade.buyer_payment_sent && trade.seller_payment_received && trade.status === 'under_behandling') {
    db.prepare(`UPDATE trades SET status = 'genomford' WHERE id = ?`).run(tradeId);

    // Uppdatera ägarskap: flytta aktier privat-innehav från säljare till köpare
    const seller = db.prepare('SELECT * FROM users WHERE id = ?').get(trade.seller_id);
    const buyer = db.prepare('SELECT * FROM users WHERE id = ?').get(trade.buyer_id);

    let qtyToRemove = trade.quantity;
    let newSellerPrivate = seller.shares_private;
    let newSellerCompany = seller.shares_company;
    // Dra först från privat innehav, sedan företagsinnehav om det skulle behövas
    if (newSellerPrivate >= qtyToRemove) {
      newSellerPrivate -= qtyToRemove;
    } else {
      qtyToRemove -= newSellerPrivate;
      newSellerPrivate = 0;
      newSellerCompany = Math.max(0, newSellerCompany - qtyToRemove);
    }

    db.prepare(`UPDATE users SET shares_private = ?, shares_company = ? WHERE id = ?`)
      .run(newSellerPrivate, newSellerCompany, seller.id);
    db.prepare(`UPDATE users SET shares_private = shares_private + ? WHERE id = ?`)
      .run(trade.quantity, buyer.id);
  }
}

export default router;
