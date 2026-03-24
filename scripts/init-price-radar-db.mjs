#!/usr/bin/env node
/**
 * Crea il file SQLite Price Radar ed esegue schema + seed (se non ci sono prodotti).
 * Uso: node scripts/init-price-radar-db.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

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

const schemaSql = fs.readFileSync(schemaPath, "utf8");
const seedSql = fs.readFileSync(seedPath, "utf8");

const db = new Database(dbFile);
db.exec(schemaSql);

const { c } = db.prepare("SELECT COUNT(*) AS c FROM products").get();
if (c === 0) {
  db.exec(seedSql);
  console.log("Price Radar: creato DB e applicato seed iniziale:", dbFile);
} else {
  console.log("Price Radar: schema aggiornato, prodotti già presenti (seed saltato):", dbFile);
}

db.close();
