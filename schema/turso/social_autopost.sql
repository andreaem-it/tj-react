-- Esegui su Turso solo se preferisci creare la tabella a mano (altrimenti la crea l'API alla prima richiesta).

CREATE TABLE IF NOT EXISTS social_autopost_log (
  wp_post_id INTEGER NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  remote_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (wp_post_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_autopost_updated ON social_autopost_log(updated_at);
