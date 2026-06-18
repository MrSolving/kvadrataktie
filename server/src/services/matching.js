import { db } from '../db/index.js';
import { v4 as uuid } from 'uuid';

/**
 * Matchar köp- och säljordrar för en handelsperiod enligt FIFO,
 * till periodens fastställda pris. Skapar en trade per matchat par.
 * Körs i en transaktion. Returnerar sammanfattning.
 *
 * Modell: säljordrarna hålls i en FIFO-kö (array). För varje köpare gås kön
 * igenom från början; ordrar som ägs av köparen själv hoppas lokalt över
 * (men ligger kvar i kön för andra köpare). Kön muteras genom att kvantitet
 * minskar, och poster tas bort när de är helt matchade.
 */
export function matchTradingPeriod(periodId) {
  const period = db.prepare('SELECT * FROM trading_periods WHERE id = ?').get(periodId);
  if (!period) throw new Error('Handelsperiod hittades inte');
  if (period.price === null || period.price === undefined) {
    throw new Error('Pris måste vara fastställt innan matchning kan ske');
  }

  const run = db.transaction(() => {
    const buyOrders = db.prepare(`
      SELECT * FROM orders
      WHERE trading_period_id = ? AND type = 'buy' AND remaining_quantity > 0
        AND status NOT IN ('avbruten', 'slutford')
      ORDER BY created_at ASC
    `).all(periodId);

    // Säljkö i FIFO-ordning. Vi muterar remaining_quantity direkt på objekten
    // och tar bort poster från kön när de är helt matchade.
    const sellQueue = db.prepare(`
      SELECT * FROM orders
      WHERE trading_period_id = ? AND type = 'sell' AND remaining_quantity > 0
        AND status NOT IN ('avbruten', 'slutford')
      ORDER BY created_at ASC
    `).all(periodId);

    const updateOrderStmt = db.prepare(`
      UPDATE orders SET remaining_quantity = ?, status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?
    `);
    const insertTradeStmt = db.prepare(`
      INSERT INTO trades (id, trading_period_id, buy_order_id, sell_order_id, buyer_id, seller_id, quantity, price, status)
      VALUES (@id, @trading_period_id, @buy_order_id, @sell_order_id, @buyer_id, @seller_id, @quantity, @price, 'under_behandling')
    `);

    const trades = [];

    for (const buyOrder of buyOrders) {
      let buyRemaining = buyOrder.remaining_quantity;

      // Gå igenom säljkön från början, hitta första sälj-order som inte
      // ägs av denna köpare och som har kvantitet kvar.
      let i = 0;
      while (buyRemaining > 0 && i < sellQueue.length) {
        const sellOrder = sellQueue[i];

        if (sellOrder.remaining_quantity <= 0) {
          // Helt matchad sedan tidigare - ta bort ur kön
          sellQueue.splice(i, 1);
          continue;
        }

        if (sellOrder.user_id === buyOrder.user_id) {
          // Kan inte matcha mot egen order - prova nästa i kön
          i++;
          continue;
        }

        const matchQty = Math.min(buyRemaining, sellOrder.remaining_quantity);

        insertTradeStmt.run({
          id: uuid(),
          trading_period_id: periodId,
          buy_order_id: buyOrder.id,
          sell_order_id: sellOrder.id,
          buyer_id: buyOrder.user_id,
          seller_id: sellOrder.user_id,
          quantity: matchQty,
          price: period.price
        });

        trades.push({ buyOrderId: buyOrder.id, sellOrderId: sellOrder.id, qty: matchQty });

        buyRemaining -= matchQty;
        sellOrder.remaining_quantity -= matchQty;

        const sellStatus = sellOrder.remaining_quantity === 0 ? 'genomford' : 'under_behandling';
        updateOrderStmt.run(sellOrder.remaining_quantity, sellStatus, sellOrder.id);

        if (sellOrder.remaining_quantity === 0) {
          sellQueue.splice(i, 1);
          // Inget i++ här: nästa element har flyttat in på index i
        } else {
          // Säljordern har kvantitet kvar - då måste köparen vara mätt (buyRemaining === 0),
          // loopen avslutas av villkoret ovan.
          i++;
        }
      }

      const buyStatus = buyRemaining === 0 ? 'genomford' : 'under_behandling';
      updateOrderStmt.run(buyRemaining, buyStatus, buyOrder.id);
      buyOrder.remaining_quantity = buyRemaining;
    }

    // Sätt periodens status till 'matching' (matchning genomförd, väntar på betalningar/rapportering)
    db.prepare(`UPDATE trading_periods SET status = 'matching' WHERE id = ?`).run(periodId);

    return trades;
  });

  const trades = run();
  return {
    tradesCreated: trades.length,
    totalQuantityMatched: trades.reduce((sum, t) => sum + t.qty, 0)
  };
}
