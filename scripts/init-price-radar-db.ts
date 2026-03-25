/**
 * Crea il file SQLite Price Radar ed esegue schema + seed (se non ci sono prodotti).
 * Applica anche migrazioni additive (003) su DB esistenti.
 * Uso: npm run price-radar:init
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { PriceRadarSqlDatabase } from "../lib/priceRadar/sqliteAdapter";

async function main(): Promise<void> {
  const require = createRequire(import.meta.url);
  const sqlJsDist = path.dirname(require.resolve("sql.js"));

  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(sqlJsDist, file),
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const root = path.join(__dirname, "..");
  const envPath = process.env.PRICE_RADAR_SQLITE_PATH?.trim();
  const dbFile = envPath
    ? path.isAbsolute(envPath)
      ? envPath
      : path.join(root, envPath)
    : path.join(root, "data", "price-radar.db");

  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const schemaPath = path.join(root, "schema", "price-radar", "001_schema.sql");
  const seedPath = path.join(root, "schema", "price-radar", "002_seed.sql");
  const migratePath = path.join(root, "schema", "price-radar", "003_migrate_additive.sql");

  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const seedSql = fs.readFileSync(seedPath, "utf8");

  const fileBuf = fs.existsSync(dbFile) ? fs.readFileSync(dbFile) : undefined;
  const db = new SQL.Database(fileBuf);
  const flush = () => {
    fs.writeFileSync(dbFile, Buffer.from(db.export()));
  };
  const wrapper = new PriceRadarSqlDatabase(db, flush);

  wrapper.exec(schemaSql);

  if (fs.existsSync(migratePath)) {
    const migrateSql = fs.readFileSync(migratePath, "utf8");
    for (const rawChunk of migrateSql.split(";")) {
      const stmt = rawChunk.replace(/--[^\n]*/g, "").trim();
      if (!stmt) continue;
      try {
        db.run(stmt + ";");
        flush();
      } catch (e) {
        const msg = String(e && e instanceof Error ? e.message : e);
        if (!msg.includes("duplicate column name")) {
          throw e;
        }
      }
    }
  }

  const countRow = wrapper.prepare("SELECT COUNT(*) AS c FROM products").get() as
    | { c: number | string }
    | undefined;
  const c = Number(countRow?.c ?? 0);
  if (c === 0) {
    wrapper.exec(seedSql);
    console.log("Price Radar: creato DB e applicato seed iniziale:", dbFile);
  } else {
    console.log("Price Radar: schema aggiornato, prodotti già presenti (seed saltato):", dbFile);
  }

  wrapper.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
