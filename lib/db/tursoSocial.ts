/**
 * Turso: log idempotenza pubblicazioni social da WordPress.
 * Nessun uso di Neon.
 */

import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

export function getTursoClient(): Client | null {
  const url =
    process.env.TURSO_DATABASE_URL?.trim() ||
    process.env.tj_autoposter_TURSO_DATABASE_URL?.trim();
  const authToken =
    process.env.TURSO_AUTH_TOKEN?.trim() ||
    process.env.tj_autoposter_TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) return null;
  if (!client) {
    client = createClient({ url, authToken });
  }
  return client;
}

export async function ensureSocialAutopostSchema(db: Client): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS social_autopost_log (
      wp_post_id INTEGER NOT NULL,
      platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram')),
      remote_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
      error_message TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (wp_post_id, platform)
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_social_autopost_updated ON social_autopost_log(updated_at)`
  );
}

export type Platform = "facebook" | "instagram";

export async function getAutopostStatus(
  db: Client,
  wpPostId: number,
  platform: Platform
): Promise<{ status: string; remote_id: string | null } | null> {
  const r = await db.execute({
    sql: `SELECT status, remote_id FROM social_autopost_log WHERE wp_post_id = ? AND platform = ?`,
    args: [wpPostId, platform],
  });
  const row = r.rows[0];
  if (!row) return null;
  return {
    status: String(row.status),
    remote_id: row.remote_id != null ? String(row.remote_id) : null,
  };
}

export async function upsertAutopostLog(
  db: Client,
  wpPostId: number,
  platform: Platform,
  status: "success" | "failed" | "skipped",
  remoteId: string | null,
  errorMessage: string | null
): Promise<void> {
  const updatedAt = new Date().toISOString();
  await db.execute({
    sql: `INSERT INTO social_autopost_log (wp_post_id, platform, remote_id, status, error_message, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(wp_post_id, platform) DO UPDATE SET
            remote_id = excluded.remote_id,
            status = excluded.status,
            error_message = excluded.error_message,
            updated_at = excluded.updated_at`,
    args: [wpPostId, platform, remoteId, status, errorMessage, updatedAt],
  });
}
