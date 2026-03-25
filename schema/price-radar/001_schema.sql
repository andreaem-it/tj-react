-- Price Radar – SQLite schema
-- Applica con: sqlite3 data/price-radar.db < schema/price-radar/001_schema.sql
-- oppure: npm run price-radar:init
-- Aggiornamento prezzi: worker Node `npm run price-radar:cron` (es. crontab ogni 15 min)

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asin TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'amazon_it',
  url TEXT NOT NULL,
  canonical_url TEXT,
  title TEXT,
  brand TEXT,
  category TEXT,
  image_url TEXT,
  current_price REAL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  availability TEXT NOT NULL DEFAULT 'unknown',
  last_seen_at TEXT,
  last_checked_at TEXT,
  last_price_change_at TEXT,
  first_tracked_at TEXT NOT NULL DEFAULT (datetime('now')),
  tracking_status TEXT NOT NULL DEFAULT 'active',
  priority_level TEXT NOT NULL DEFAULT 'cold',
  score REAL NOT NULL DEFAULT 0,
  check_interval_minutes INTEGER NOT NULL DEFAULT 2880,
  next_check_at TEXT NOT NULL DEFAULT (datetime('now')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (asin, source)
);

CREATE INDEX IF NOT EXISTS idx_products_next_check
  ON products (tracking_status, next_check_at);

CREATE INDEX IF NOT EXISTS idx_products_priority
  ON products (priority_level, score DESC);

CREATE INDEX IF NOT EXISTS idx_products_asin_source
  ON products (asin, source);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  detected_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_type TEXT NOT NULL DEFAULT 'scrape',
  is_available INTEGER NOT NULL DEFAULT 1,
  raw_price_text TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_time
  ON price_history (product_id, detected_at DESC);

CREATE TABLE IF NOT EXISTS product_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL UNIQUE,
  views_24h INTEGER NOT NULL DEFAULT 0,
  clicks_24h INTEGER NOT NULL DEFAULT 0,
  article_mentions INTEGER NOT NULL DEFAULT 0,
  manual_boost INTEGER NOT NULL DEFAULT 0,
  event_boost INTEGER NOT NULL DEFAULT 0,
  last_interest_at TEXT,
  views_period_start TEXT,
  clicks_period_start TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_metrics_updated
  ON product_metrics (updated_at);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  http_code INTEGER,
  parser_used TEXT,
  price_found INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  response_hash TEXT,
  response_time_ms INTEGER,
  parser_confidence REAL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_product
  ON scrape_runs (product_id, started_at DESC);
