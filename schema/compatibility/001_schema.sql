-- Modulo compatibility: Apple device ↔ OS (SQLite)
-- Applicare: sqlite3 data/compatibility.db < schema/compatibility/001_schema.sql
-- (l'app inizializza anche automaticamente alla prima connessione)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('iphone', 'ipad', 'mac')),
  release_year INTEGER,
  end_of_support_year INTEGER,
  chipset TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_slug ON devices(slug);

CREATE TABLE IF NOT EXISTS operating_systems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('ios', 'macos', 'ipados')),
  release_year INTEGER,
  is_future INTEGER NOT NULL DEFAULT 0 CHECK (is_future IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_os_type ON operating_systems(type);
CREATE INDEX IF NOT EXISTS idx_os_slug ON operating_systems(slug);

CREATE TABLE IF NOT EXISTS compatibility (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  os_id INTEGER NOT NULL REFERENCES operating_systems(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('supported', 'unsupported', 'partial', 'community')),
  support_type TEXT NOT NULL CHECK (support_type IN ('official', 'predicted', 'opencore')),
  experience TEXT NOT NULL CHECK (experience IN ('excellent', 'good', 'limited', 'poor')),
  notes TEXT,
  UNIQUE(device_id, os_id)
);

CREATE INDEX IF NOT EXISTS idx_compat_device ON compatibility(device_id);
CREATE INDEX IF NOT EXISTS idx_compat_os ON compatibility(os_id);
CREATE INDEX IF NOT EXISTS idx_compat_status ON compatibility(status);
