import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

let singleton: Database.Database | null = null;

function defaultDbPath(): string {
  const fromEnv = process.env.PRICE_RADAR_SQLITE_PATH?.trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  return path.join(process.cwd(), "data", "price-radar.db");
}

/**
 * Apre il database Price Radar (solo lato server).
 * Se il file non esiste, lancia errore: eseguire `npm run price-radar:init`.
 */
export function getPriceRadarDb(): Database.Database {
  if (singleton) return singleton;
  const file = defaultDbPath();
  if (!fs.existsSync(file)) {
    throw new Error(
      `Price Radar DB mancante: ${file}. Esegui: npm run price-radar:init`
    );
  }
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  singleton = db;
  return db;
}

export function isPriceRadarDbConfigured(): boolean {
  const file = defaultDbPath();
  return fs.existsSync(file);
}

export function resetPriceRadarDbSingleton(): void {
  if (singleton) {
    try {
      singleton.close();
    } catch {
      /* ignore */
    }
    singleton = null;
  }
}
