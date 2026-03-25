import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";
import { PriceRadarSqlDatabase } from "./sqliteAdapter";

const require = createRequire(import.meta.url);
/** Directory `dist/` di sql.js (contiene sql-wasm.wasm). */
const sqlJsDist = path.dirname(require.resolve("sql.js"));

export type PriceRadarDb = PriceRadarSqlDatabase;

type SqlJsModule = Awaited<ReturnType<typeof initSqlJs>>;

let sqlJsStatic: SqlJsModule | null = null;
let sqlJsPromise: Promise<SqlJsModule> | null = null;

async function ensureSqlJs(): Promise<SqlJsModule> {
  if (sqlJsStatic) return sqlJsStatic;
  if (!sqlJsPromise) {
    sqlJsPromise = initSqlJs({
      locateFile: (file: string) => path.join(sqlJsDist, file),
    }).then((m) => {
      sqlJsStatic = m;
      return m;
    });
  }
  return sqlJsPromise;
}

let singleton: PriceRadarSqlDatabase | null = null;
let dbOpenPromise: Promise<PriceRadarSqlDatabase> | null = null;

function defaultDbPath(): string {
  const fromEnv = process.env.PRICE_RADAR_SQLITE_PATH?.trim();
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  return path.join(process.cwd(), "data", "price-radar.db");
}

/**
 * Apre il database Price Radar (solo lato server).
 * Se il file non esiste, lancia errore: eseguire `npm run price-radar:init`.
 */
export async function getPriceRadarDb(): Promise<PriceRadarSqlDatabase> {
  if (singleton) return singleton;
  if (!dbOpenPromise) {
    dbOpenPromise = (async () => {
      const SQL = await ensureSqlJs();
      const file = defaultDbPath();
      if (!fs.existsSync(file)) {
        throw new Error(`Price Radar DB mancante: ${file}. Esegui: npm run price-radar:init`);
      }
      const buf = fs.readFileSync(file);
      const db = new SQL.Database(buf);
      const flush = () => {
        fs.writeFileSync(file, Buffer.from(db.export()));
      };
      const wrapper = new PriceRadarSqlDatabase(db, flush);
      wrapper.pragma("foreign_keys = ON");
      singleton = wrapper;
      return wrapper;
    })();
  }
  return dbOpenPromise;
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
  }
  singleton = null;
  dbOpenPromise = null;
  sqlJsStatic = null;
  sqlJsPromise = null;
}
