import { db } from '../db/index.js';
import { v4 as uuid } from 'uuid';

/**
 * Genererar en enkel CSV-fil med genomförda trades för en period,
 * formaterad för överlämning till Euroclear.
 * Format: trade_id;vp_konto_saljare;vp_konto_kopare;antal;pris;datum
 */
export function generateEuroclearFile(periodId, generatedBy) {
  const period = db.prepare('SELECT * FROM trading_periods WHERE id = ?').get(periodId);
  if (!period) throw new Error('Handelsperiod hittades inte');

  const trades = db.prepare(`
    SELECT t.*, 
           bu.vp_konto as buyer_vp, bu.name as buyer_name, bu.personnummer_orgnr as buyer_pnr,
           su.vp_konto as seller_vp, su.name as seller_name, su.personnummer_orgnr as seller_pnr
    FROM trades t
    JOIN users bu ON bu.id = t.buyer_id
    JOIN users su ON su.id = t.seller_id
    WHERE t.trading_period_id = ? AND t.status NOT IN ('rapporterad_euroclear', 'slutford')
  `).all(periodId);

  if (trades.length === 0) {
    throw new Error('Inga affärer att rapportera för denna period (eventuellt redan rapporterade)');
  }

  const header = 'trade_id;saljare_namn;saljare_pnr_orgnr;saljare_vp;kopare_namn;kopare_pnr_orgnr;kopare_vp;antal;pris;period';
  const rows = trades.map(t => [
    t.id,
    t.seller_name,
    t.seller_pnr || '',
    t.seller_vp || '',
    t.buyer_name,
    t.buyer_pnr || '',
    t.buyer_vp || '',
    t.quantity,
    t.price,
    period.name
  ].join(';'));

  const content = [header, ...rows].join('\n');
  const filename = `euroclear_export_${period.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;

  const exportId = uuid();
  db.prepare(`
    INSERT INTO euroclear_exports (id, trading_period_id, file_content, filename, generated_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(exportId, periodId, content, filename, generatedBy);

  // Markera trades som rapporterade till Euroclear
  const tradeIds = trades.map(t => t.id);
  const updateStmt = db.prepare(`
    UPDATE trades SET status = 'rapporterad_euroclear', euroclear_reported_at = datetime('now', 'localtime') WHERE id = ?
  `);
  for (const id of tradeIds) updateStmt.run(id);

  // Uppdatera tillhörande orders status om alla deras trades är rapporterade
  syncOrderStatusesForPeriod(periodId);

  return { exportId, filename, content, tradeCount: trades.length };
}

function syncOrderStatusesForPeriod(periodId) {
  const orders = db.prepare(`SELECT * FROM orders WHERE trading_period_id = ?`).all(periodId);
  for (const order of orders) {
    const relatedTrades = db.prepare(`
      SELECT * FROM trades WHERE ${order.type === 'buy' ? 'buy_order_id' : 'sell_order_id'} = ?
    `).all(order.id);
    if (relatedTrades.length === 0) continue;
    const allReported = relatedTrades.every(t => t.status === 'rapporterad_euroclear' || t.status === 'slutford');
    if (allReported && order.remaining_quantity === 0) {
      db.prepare(`UPDATE orders SET status = 'rapporterad_euroclear', updated_at = datetime('now', 'localtime') WHERE id = ?`).run(order.id);
    }
  }
}

/**
 * Tar emot en resultatfil från Euroclear (CSV) och stämmer av mot aktieboken.
 * Förväntat format: vp_konto;personnummer_orgnr;namn;antal
 */
export function importEuroclearFile(periodId, rawContent, importedBy, filename) {
  const importId = uuid();
  db.prepare(`
    INSERT INTO euroclear_imports (id, trading_period_id, filename, raw_content, imported_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(importId, periodId || null, filename || 'import.csv', rawContent, importedBy);

  const lines = rawContent.split('\n').map(l => l.trim()).filter(Boolean);
  const dataLines = lines[0]?.toLowerCase().includes('vp_konto') ? lines.slice(1) : lines;

  const insertHolding = db.prepare(`
    INSERT INTO official_holdings (id, import_id, vp_konto, personnummer_orgnr, name, quantity, matched_user_id, discrepancy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const results = [];
  for (const line of dataLines) {
    const parts = line.split(';').map(p => p.trim());
    const [vp_konto, personnummer_orgnr, name, quantityStr] = parts;
    const quantity = parseInt(quantityStr, 10) || 0;

    // Försök matcha mot befintlig ägare via VP-konto eller personnummer/orgnr
    let matchedUser = null;
    if (vp_konto) {
      matchedUser = db.prepare('SELECT * FROM users WHERE vp_konto = ?').get(vp_konto);
    }
    if (!matchedUser && personnummer_orgnr) {
      matchedUser = db.prepare('SELECT * FROM users WHERE personnummer_orgnr = ?').get(personnummer_orgnr);
    }

    let discrepancy = null;
    if (matchedUser) {
      const totalHeld = matchedUser.shares_company + matchedUser.shares_private;
      discrepancy = quantity - totalHeld;
    }

    const holdingId = uuid();
    insertHolding.run(holdingId, importId, vp_konto, personnummer_orgnr, name, quantity, matchedUser?.id || null, discrepancy);
    results.push({ vp_konto, name, quantity, matchedUserId: matchedUser?.id || null, discrepancy });
  }

  return { importId, rowsProcessed: results.length, results };
}

export function getReconciliation(importId) {
  const holdings = db.prepare(`
    SELECT oh.*, u.name as system_name, u.shares_company, u.shares_private
    FROM official_holdings oh
    LEFT JOIN users u ON u.id = oh.matched_user_id
    WHERE oh.import_id = ?
  `).all(importId);
  return holdings;
}
