import express from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

router.use(authRequired);

// Lägg en ny order (köp eller sälj) i en öppen handelsperiod
router.post('/', (req, res) => {
  const { trading_period_id, type, quantity, share_type } = req.body;
  const userId = req.user.id;

  if (!trading_period_id || !type || !quantity) {
    return res.status(400).json({ error: 'trading_period_id, type och quantity krävs' });
  }
  if (!['buy', 'sell'].includes(type)) {
    return res.status(400).json({ error: 'type måste vara buy eller sell' });
  }
  if (type === 'sell' && !['privat', 'foretag'].includes(share_type)) {
    return res.status(400).json({ error: 'share_type måste vara privat eller foretag för säljorder' });
  }

  const period = db.prepare('SELECT * FROM trading_periods WHERE id = ?').get(trading_period_id);
  if (!period) return res.status(404).json({ error: 'Handelsperiod hittades inte' });
  if (period.status !== 'open') {
    return res.status(400).json({ error: 'Handelsperioden är inte öppen för orderläggning' });
  }

  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0 || qty % period.lot_size !== 0) {
    return res.status(400).json({ error: `Antal måste vara ett jämnt multipel av ${period.lot_size}` });
  }

  // Vid säljorder: kontrollera att användaren har tillräckligt innehav per aktietyp
  if (type === 'sell') {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const holding = share_type === 'privat' ? user.shares_private : user.shares_company;
    const label = share_type === 'privat' ? 'privata' : 'företagets';

    const existingQty = db.prepare(`
      SELECT COALESCE(SUM(remaining_quantity), 0) as total FROM orders
      WHERE user_id = ? AND trading_period_id = ? AND type = 'sell'
        AND share_type = ? AND status != 'avbruten'
    `).get(userId, trading_period_id, share_type).total;

    if (existingQty + qty > holding) {
      return res.status(400).json({
        error: `Otillräckligt innehav av ${label} aktier (${holding} st tillgängliga, ${existingQty} st redan i säljorder)`
      });
    }
  }

  const id = uuid();
  db.prepare(`
    INSERT INTO orders (id, user_id, trading_period_id, type, share_type, quantity, remaining_quantity, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'initierad')
  `).run(id, userId, trading_period_id, type, type === 'sell' ? share_type : null, qty, qty);

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  res.status(201).json(order);
});

// Orderdjup för en handelsperiod (aggregerat, alla autentiserade användare)
router.get('/depth/:periodId', (req, res) => {
  const period = db.prepare('SELECT * FROM trading_periods WHERE id = ?').get(req.params.periodId);
  if (!period) return res.status(404).json({ error: 'Handelsperiod hittades inte' });

  const rows = db.prepare(`
    SELECT
      type,
      status,
      COUNT(*) as order_count,
      SUM(quantity) as total_quantity,
      SUM(remaining_quantity) as remaining_quantity
    FROM orders
    WHERE trading_period_id = ?
    GROUP BY type, status
    ORDER BY type, status
  `).all(req.params.periodId);

  res.json({ period, rows });
});

// Hämta mina ordrar
router.get('/mine', (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, tp.name as period_name, tp.status as period_status, tp.price as period_price
    FROM orders o
    JOIN trading_periods tp ON tp.id = o.trading_period_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id);
  res.json(orders);
});

// Ändra (endast kvantitet) en order som ännu inte är matchad/utförd
router.patch('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order hittades inte' });
  if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Du äger inte denna order' });
  if (order.status !== 'initierad') {
    return res.status(400).json({ error: 'Endast ordrar med status Initierad kan ändras' });
  }

  const { quantity } = req.body;
  const period = db.prepare('SELECT * FROM trading_periods WHERE id = ?').get(order.trading_period_id);

  if (quantity !== undefined) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0 || qty % period.lot_size !== 0) {
      return res.status(400).json({ error: `Antal måste vara ett jämnt multipel av ${period.lot_size}` });
    }
    db.prepare(`UPDATE orders SET quantity = ?, remaining_quantity = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`)
      .run(qty, qty, order.id);
  }

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  res.json(updated);
});

// Avbryt en order som inte är matchad/utförd
router.delete('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order hittades inte' });
  if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Du äger inte denna order' });
  if (order.status !== 'initierad') {
    return res.status(400).json({ error: 'Endast ordrar med status Initierad kan avbrytas' });
  }
  db.prepare(`UPDATE orders SET status = 'avbruten', remaining_quantity = 0, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(order.id);
  res.json({ ok: true });
});

export default router;
