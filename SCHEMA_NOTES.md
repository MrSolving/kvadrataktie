# Databasschema - Kvadrat Aktiehandel

## users
- id, email, password_hash, role ('owner' | 'admin')
- name, personnummer_orgnr, vp_konto, bankkonto_forsaljning
- shares_company (innehav via bolag), shares_private (privat innehav)
- in_hembudskrets (bool) - om de omfattas av hembudsrätt
- created_at

## trading_periods (handelsperioder)
- id, name, start_date, end_date, price (fastställt pris, sätts av admin)
- status ('upcoming' | 'open' | 'matching' | 'closed')
- created_at

## orders
- id, user_id, trading_period_id
- type ('buy' | 'sell')
- quantity (multipel av 100)
- remaining_quantity (minskar vid matchning)
- status ('initierad' | 'under_behandling' | 'genomford' | 'rapporterad_euroclear' | 'slutford' | 'avbruten')
- created_at, updated_at

## trades (affärer - skapas vid matchning, en per köpare-säljare-par)
- id, trading_period_id
- buy_order_id, sell_order_id
- buyer_id, seller_id
- quantity, price (= periodens fastställda pris)
- buyer_payment_sent (bool), buyer_payment_sent_at
- seller_payment_received (bool), seller_payment_received_at
- status ('initierad' | 'under_behandling' | 'genomford' | 'rapporterad_euroclear' | 'slutford')
- euroclear_reported_at
- created_at

## news (nyheter/information från admin)
- id, title, body, published_at, author_id

## trading_calendar (kommande handelskalendrar - kan vara separat från trading_periods, t.ex. framtida planerade datum utan pris ännu)
- id, label, start_date, end_date, notes

## euroclear_exports
- id, trading_period_id, generated_at, file_content (eller path), status
## euroclear_imports
- id, trading_period_id, imported_at, file_content, reconciliation_status, notes

## audit/share register snapshot (för avstämning)
- shareholding ledger - kan härledas från users.shares_company + shares_private,
  men vid Euroclear-avstämning behöver vi en "official_holdings" tabell att jämföra mot.

## official_holdings (importerad från Euroclear för avstämning)
- id, user_id (eller personnummer/vp_konto för matchning), quantity, source_import_id, imported_at

---

## Matchningslogik (FIFO, fastställt pris)
1. Admin sätter pris + öppnar period för matchning (eller stänger orderläggning -> matchning)
2. Hämta alla 'sell' orders med remaining_quantity > 0, sorterat på created_at (FIFO)
3. Hämta alla 'buy' orders med remaining_quantity > 0, sorterat på created_at (FIFO)
4. Looping: ta första köp-order, matcha mot första sälj-order(s) tills kvantitet är fylld
   - match_qty = min(buy.remaining, sell.remaining), måste vara multipel av 100
   - Skapa trade(buyer, seller, match_qty, price)
   - Minska remaining på båda
   - Om sell.remaining == 0 -> nästa sell order
   - Om buy.remaining == 0 -> nästa buy order
5. Orders med remaining_quantity == 0 -> status 'genomford' (delvis matchade orders kvar som 'under_behandling')
