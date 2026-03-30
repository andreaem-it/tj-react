import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const globalForDb = globalThis as unknown as {
  __compatibilityDb?: Database.Database;
};

function getDefaultDbPath(): string {
  const fromEnv = process.env.COMPATIBILITY_DATABASE_PATH?.trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  return path.join(process.cwd(), "data", "compatibility.db");
}

function readSchemaSql(): string {
  const schemaPath = path.join(process.cwd(), "schema", "compatibility", "001_schema.sql");
  try {
    return fs.readFileSync(schemaPath, "utf8");
  } catch {
    throw new Error(
      `Schema compatibility non trovato: ${schemaPath}. Copia schema/compatibility/001_schema.sql nel progetto.`,
    );
  }
}

function initSchema(db: Database.Database): void {
  db.exec(readSchemaSql());
}

/**
 * Connessione singleton SQLite (runtime Node). Crea `data/` e applica lo schema se mancante.
 */
export function getCompatibilityDb(): Database.Database {
  if (globalForDb.__compatibilityDb) {
    return globalForDb.__compatibilityDb;
  }
  const dbPath = getDefaultDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  globalForDb.__compatibilityDb = db;
  return db;
}
