-- Esempio dati di test (opzionale). Dopo aver creato il DB:
--   sqlite3 data/compatibility.db < schema/compatibility/seed_example.sql
-- Oppure inserisci dal pannello /admin/compatibility

INSERT OR IGNORE INTO devices (id, name, slug, type, release_year, chipset, notes)
VALUES
  (1, 'iPhone 15', 'iphone-15', 'iphone', 2023, 'A16 Bionic', NULL);

INSERT OR IGNORE INTO operating_systems (id, name, slug, type, release_year, is_future)
VALUES
  (1, 'iOS 18', 'ios-18', 'ios', 2024, 0);

INSERT OR IGNORE INTO compatibility (device_id, os_id, status, support_type, experience, notes)
VALUES
  (1, 1, 'supported', 'official', 'excellent', 'Esempio');
