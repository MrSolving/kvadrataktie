-- Kvadrat Aktiehandel - databasschema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('owner', 'admin')),
  name TEXT NOT NULL,
  personnummer_orgnr TEXT,
  vp_konto TEXT,
  bankkonto_forsaljning TEXT,
  shares_company INTEGER NOT NULL DEFAULT 0,
  shares_private INTEGER NOT NULL DEFAULT 0,
  in_hembudskrets INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS trading_periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  price REAL,
  lot_size INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','open','matching','closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  trading_period_id TEXT NOT NULL REFERENCES trading_periods(id),
  type TEXT NOT NULL CHECK(type IN ('buy','sell')),
  share_type TEXT CHECK(share_type IN ('privat','foretag')),
  quantity INTEGER NOT NULL,
  remaining_quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'initierad' CHECK(status IN ('initierad','under_behandling','genomford','rapporterad_euroclear','slutford','avbruten')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  trading_period_id TEXT NOT NULL REFERENCES trading_periods(id),
  buy_order_id TEXT NOT NULL REFERENCES orders(id),
  sell_order_id TEXT NOT NULL REFERENCES orders(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  buyer_payment_sent INTEGER NOT NULL DEFAULT 0,
  buyer_payment_sent_at TEXT,
  seller_payment_received INTEGER NOT NULL DEFAULT 0,
  seller_payment_received_at TEXT,
  status TEXT NOT NULL DEFAULT 'initierad' CHECK(status IN ('initierad','under_behandling','genomford','rapporterad_euroclear','slutford')),
  euroclear_reported_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  author_id TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS trading_calendar (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS euroclear_exports (
  id TEXT PRIMARY KEY,
  trading_period_id TEXT NOT NULL REFERENCES trading_periods(id),
  generated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  file_content TEXT NOT NULL,
  filename TEXT NOT NULL,
  generated_by TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS euroclear_imports (
  id TEXT PRIMARY KEY,
  trading_period_id TEXT REFERENCES trading_periods(id),
  imported_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  filename TEXT,
  raw_content TEXT,
  imported_by TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS official_holdings (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL REFERENCES euroclear_imports(id),
  vp_konto TEXT,
  personnummer_orgnr TEXT,
  name TEXT,
  quantity INTEGER NOT NULL,
  matched_user_id TEXT REFERENCES users(id),
  discrepancy INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS voting_sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('kongress','stamma')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming','open','closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  created_by TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS motions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  motion_id TEXT NOT NULL REFERENCES motions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  vote TEXT NOT NULL CHECK(vote IN ('ja','nej','avstar')),
  vote_weight INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE(motion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_orders_period ON orders(trading_period_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_period ON trades(trading_period_id);
CREATE INDEX IF NOT EXISTS idx_trades_buyer ON trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller ON trades(seller_id);
