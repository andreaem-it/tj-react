-- Ingestor: fonti RSS e item in coda (Neon Postgres).
-- Riferimento manuale: tj-api crea automaticamente queste tabelle all'avvio (ensureIngestorSchema).
-- Usa questo file solo per ispezione o migrazioni esterne.

CREATE TABLE IF NOT EXISTS ingest_feed_sources (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  feed_url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ingest_feed_sources_feed_url_unique UNIQUE (feed_url)
);

CREATE TABLE IF NOT EXISTS ingest_feed_items (
  id BIGSERIAL PRIMARY KEY,
  source_id INT NOT NULL REFERENCES ingest_feed_sources (id) ON DELETE CASCADE,
  url_hash CHAR(64) NOT NULL,
  url TEXT NOT NULL,
  title_original TEXT NOT NULL DEFAULT '',
  title_it TEXT,
  summary_plain TEXT,
  published_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  gpt_error TEXT,
  article_id INT REFERENCES articles (id) ON DELETE SET NULL,
  elaborated_at TIMESTAMPTZ,
  autoposter_relevance_score NUMERIC(5, 2),
  autoposter_duplicate_article_id INT REFERENCES articles (id) ON DELETE SET NULL,
  autoposter_notes TEXT,
  autoposter_evaluated_at TIMESTAMPTZ,
  CONSTRAINT ingest_feed_items_url_hash_unique UNIQUE (url_hash),
  CONSTRAINT ingest_feed_items_status_check CHECK (
    status IN ('pending', 'elaborated', 'dismissed', 'error')
  )
);

CREATE INDEX IF NOT EXISTS idx_ingest_feed_items_source_id ON ingest_feed_items (source_id);
CREATE INDEX IF NOT EXISTS idx_ingest_feed_items_status ON ingest_feed_items (status);
CREATE INDEX IF NOT EXISTS idx_ingest_feed_items_synced_at ON ingest_feed_items (synced_at DESC);
