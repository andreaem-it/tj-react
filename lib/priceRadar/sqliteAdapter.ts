import type { Database as SqlJsDatabase } from "sql.js";

/** Allineato a @types/sql.js (SqlValue). */
type SqlBind = number | string | Uint8Array | null;

/** API compatibile con better-sqlite3 (prepare → get/all/run) su sql.js. */
export interface PriceRadarStatement {
  get(...params: unknown[]): Record<string, unknown> | undefined;
  all(...params: unknown[]): Record<string, unknown>[];
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
}

export class PriceRadarSqlDatabase {
  constructor(
    private readonly db: SqlJsDatabase,
    private readonly flushToDisk: () => void
  ) {}

  exec(sql: string): void {
    this.db.exec(sql);
    this.flushToDisk();
  }

  /** Equivalente a db.pragma('foreign_keys = ON') ecc. */
  pragma(source: string): void {
    try {
      this.db.run(`PRAGMA ${source}`);
    } catch {
      /* sql.js non supporta tutti i pragma (es. WAL su file emulato) */
    }
    this.flushToDisk();
  }

  prepare(sql: string): PriceRadarStatement {
    const db = this.db;
    const flush = this.flushToDisk;
    return {
      get(...params: unknown[]) {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params as SqlBind[]);
        const hasRow = stmt.step();
        const row = hasRow ? (stmt.getAsObject() as Record<string, unknown>) : undefined;
        stmt.free();
        return row;
      },
      all(...params: unknown[]) {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params as SqlBind[]);
        const rows: Record<string, unknown>[] = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject() as Record<string, unknown>);
        }
        stmt.free();
        return rows;
      },
      run(...params: unknown[]) {
        const stmt = db.prepare(sql);
        if (params.length) stmt.bind(params as SqlBind[]);
        stmt.step();
        stmt.free();
        const changes = db.getRowsModified();
        const idStmt = db.prepare("SELECT last_insert_rowid() AS id");
        idStmt.step();
        const idObj = idStmt.getAsObject() as { id?: number | bigint };
        idStmt.free();
        const lastInsertRowid = Number(idObj?.id ?? 0);
        flush();
        return { changes, lastInsertRowid };
      },
    };
  }

  close(): void {
    this.flushToDisk();
    this.db.close();
  }
}
