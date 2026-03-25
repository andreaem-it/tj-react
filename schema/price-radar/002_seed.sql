-- Seed opzionale: idempotente per product_metrics e primo snapshot storico
INSERT OR IGNORE INTO products (
  asin, source, url, canonical_url, title, image_url, current_price, currency,
  availability, tracking_status, priority_level, score, check_interval_minutes,
  next_check_at, last_seen_at, last_checked_at, last_price_change_at
) VALUES
('B0DGHWD7CT', 'amazon_it', 'https://www.amazon.it/dp/B0DGHWD7CT', 'https://www.amazon.it/dp/B0DGHWD7CT',
 'Apple AirPods 4', 'https://m.media-amazon.com/images/I/61DvMw16ITL._AC_SX342_SY445_QL70_ML2_.jpg',
 149.0, 'EUR', 'unknown', 'active', 'cold', 0, 2880, datetime('now'), datetime('now'), NULL, datetime('now')),
('B0FQF32239', 'amazon_it', 'https://www.amazon.it/dp/B0FQF32239', 'https://www.amazon.it/dp/B0FQF32239',
 'Apple AirPods Pro 3', 'https://m.media-amazon.com/images/I/61VHVpa4wvL._AC_SX342_SY445_QL70_ML2_.jpg',
 209.0, 'EUR', 'unknown', 'active', 'cold', 0, 2880, datetime('now'), datetime('now'), NULL, datetime('now')),
('B0FQFLQJB1', 'amazon_it', 'https://www.amazon.it/dp/B0FQFLQJB1', 'https://www.amazon.it/dp/B0FQFLQJB1',
 'Apple Watch Series 11', 'https://m.media-amazon.com/images/I/71JPViO29PL._AC_SX342_SY445_QL70_ML2_.jpg',
 349.0, 'EUR', 'unknown', 'active', 'cold', 0, 2880, datetime('now'), datetime('now'), NULL, datetime('now')),
('B0FQGWQC6S', 'amazon_it', 'https://www.amazon.it/dp/B0FQGWQC6S', 'https://www.amazon.it/dp/B0FQGWQC6S',
 'iPhone 17 (256GB)', 'https://m.media-amazon.com/images/I/61vNxSF6qeL._AC_SX342_SY445_QL70_ML2_.jpg',
 899.0, 'EUR', 'unknown', 'active', 'cold', 0, 2880, datetime('now'), datetime('now'), NULL, datetime('now')),
('B0GR19ZS2Z', 'amazon_it', 'https://www.amazon.it/dp/B0GR19ZS2Z', 'https://www.amazon.it/dp/B0GR19ZS2Z',
 'MacBook Air M5 (16GB/512GB)', 'https://m.media-amazon.com/images/I/71ivj8pVbkL._AC_SX342_SY445_QL70_ML2_.jpg',
 965.99, 'EUR', 'unknown', 'active', 'cold', 0, 2880, datetime('now'), datetime('now'), NULL, datetime('now')),
('B0FWDF8TS7', 'amazon_it', 'https://www.amazon.it/dp/B0FWDF8TS7', 'https://www.amazon.it/dp/B0FWDF8TS7',
 'MacBook Pro M5', 'https://m.media-amazon.com/images/I/6177MFeuPYL._AC_SX342_SY445_QL70_ML2_.jpg',
 1977.99, 'EUR', 'unknown', 'active', 'cold', 0, 2880, datetime('now'), datetime('now'), NULL, datetime('now')),
('B0B6GHW1SX', 'amazon_it', 'https://www.amazon.it/dp/B0B6GHW1SX', 'https://www.amazon.it/dp/B0B6GHW1SX',
 'Sennheiser Momentum 4 Wireless', 'https://m.media-amazon.com/images/I/716%2B%2B4xC2wL._AC_SY300_SX300_QL70_ML2_.jpg',
 179.0, 'EUR', 'unknown', 'active', 'cold', 0, 2880, datetime('now'), datetime('now'), NULL, datetime('now')),
('B0CW4HD359', 'amazon_it', 'https://www.amazon.it/dp/B0CW4HD359', 'https://www.amazon.it/dp/B0CW4HD359',
 'Fire TV Stick 4K Max', 'https://m.media-amazon.com/images/I/51Syr9Bzx9L._AC_SY300_SX300_QL70_ML2_.jpg',
 47.99, 'EUR', 'unknown', 'active', 'cold', 0, 2880, datetime('now'), datetime('now'), NULL, datetime('now'));

INSERT INTO price_history (product_id, price, currency, detected_at, source_type, is_available, raw_price_text)
SELECT p.id, p.current_price, p.currency, datetime('now'), 'seed', 1, 'seed'
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM price_history h WHERE h.product_id = p.id);

INSERT INTO product_metrics (product_id, views_24h, clicks_24h, article_mentions, manual_boost, event_boost, updated_at)
SELECT p.id, 0, 0, 0, 0, 0, datetime('now')
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_metrics m WHERE m.product_id = p.id);
