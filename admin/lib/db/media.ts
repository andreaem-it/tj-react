/**
 * Layer dati media (galleria) basato su Postgres (Neon).
 * Path in stile WordPress: anno/mese/nomefile (es. 2025/03/foto.jpg).
 * Size: thumb 150x150, small, medium, large, full.
 */

import { sql } from "./neon";

export interface MediaItem {
  id: number;
  /** Path relativo nel bucket, es. 2025/03/foto.jpg */
  path: string;
  url_full: string;
  url_thumb: string;
  url_small: string;
  url_medium: string;
  url_large: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
  created_at: string;
}

export interface MediaInsert {
  path: string;
  url_full: string;
  url_thumb: string;
  url_small: string;
  url_medium: string;
  url_large: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
}

export async function listMedia(params?: {
  page?: number;
  perPage?: number;
  month?: string;
}): Promise<{
  items: MediaItem[];
  total: number;
  availableMonths: string[];
}> {
  const page = Math.max(1, params?.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params?.perPage ?? 24));
  const offset = (page - 1) * perPage;
  const month = params?.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : null;

  const monthsRows = (await sql/* sql */`
    SELECT DISTINCT to_char(created_at, 'YYYY-MM') AS month
    FROM media
    ORDER BY month DESC
  `) as { month: string }[];
  const availableMonths = monthsRows.map((r) => r.month);

  let itemsRows: any[];
  let countRows: any[];

  if (month) {
    itemsRows = (await sql/* sql */`
      SELECT *
      FROM media
      WHERE to_char(created_at, 'YYYY-MM') = ${month}
      ORDER BY created_at DESC
      LIMIT ${perPage} OFFSET ${offset}
    `) as any[];
    countRows = (await sql/* sql */`
      SELECT COUNT(*)::int AS count
      FROM media
      WHERE to_char(created_at, 'YYYY-MM') = ${month}
    `) as any[];
  } else {
    itemsRows = (await sql/* sql */`
      SELECT *
      FROM media
      ORDER BY created_at DESC
      LIMIT ${perPage} OFFSET ${offset}
    `) as any[];
    countRows = (await sql/* sql */`
      SELECT COUNT(*)::int AS count
      FROM media
    `) as any[];
  }

  const items: MediaItem[] = itemsRows.map((r: any) => ({
    id: Number(r.id),
    path: String(r.path),
    url_full: String(r.url_full),
    url_thumb: String(r.url_thumb),
    url_small: String(r.url_small),
    url_medium: String(r.url_medium),
    url_large: String(r.url_large),
    mime_type: String(r.mime_type),
    file_size: Number(r.file_size),
    width: Number(r.width),
    height: Number(r.height),
    created_at: (r.created_at instanceof Date
      ? r.created_at.toISOString()
      : String(r.created_at)) as string,
  }));

  const total = Number(((countRows[0] ?? {}) as { count?: number }).count ?? 0);

  return { items, total, availableMonths };
}

export async function createMedia(input: MediaInsert): Promise<MediaItem> {
  const rows = (await sql/* sql */`
    INSERT INTO media (
      path,
      url_full,
      url_thumb,
      url_small,
      url_medium,
      url_large,
      mime_type,
      file_size,
      width,
      height
    )
    VALUES (
      ${input.path},
      ${input.url_full},
      ${input.url_thumb},
      ${input.url_small},
      ${input.url_medium},
      ${input.url_large},
      ${input.mime_type},
      ${input.file_size},
      ${input.width},
      ${input.height}
    )
    RETURNING *
  `) as any[];

  const r = rows[0];
  const created: MediaItem = {
    id: Number(r.id),
    path: String(r.path),
    url_full: String(r.url_full),
    url_thumb: String(r.url_thumb),
    url_small: String(r.url_small),
    url_medium: String(r.url_medium),
    url_large: String(r.url_large),
    mime_type: String(r.mime_type),
    file_size: Number(r.file_size),
    width: Number(r.width),
    height: Number(r.height),
    created_at: (r.created_at instanceof Date
      ? r.created_at.toISOString()
      : String(r.created_at)) as string,
  };

  return created;
}

export async function deleteMedia(id: number): Promise<void> {
  await sql/* sql */`DELETE FROM media WHERE id = ${id}`;
}

