ALTER TABLE product_metrics ADD COLUMN event_boost INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scrape_runs ADD COLUMN response_time_ms INTEGER;
ALTER TABLE scrape_runs ADD COLUMN parser_confidence REAL;
