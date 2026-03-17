/**
 * Google Search Console API – performance in ricerca (impressioni, click, CTR, posizione).
 * Usa le stesse credenziali GA4 (service account); abilita "Search Console API" in Google Cloud
 * e aggiungi l'email del service account in GSC come utente con accesso in lettura.
 */

import { JWT } from "google-auth-library";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const BASE = "https://www.googleapis.com/webmasters/v3/sites";

export type GscOverview = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscPageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscDateRow = {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function getSiteUrl(): string | null {
  const url = process.env.GSC_SITE_URL?.trim();
  if (!url) return null;
  return url;
}

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.trim();
  if (!email || !key) return null;
  const privateKey = key.replace(/\\n/g, "\n");
  const jwt = new JWT({
    email,
    key: privateKey,
    scopes: [SCOPE],
  });
  const credentials = await jwt.authorize();
  return credentials?.access_token ?? null;
}

function formatDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - Math.max(0, days - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

async function querySearchAnalytics<T>(
  siteUrl: string,
  body: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
    aggregationType?: string;
  }
): Promise<{ rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> } | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const encoded = encodeURIComponent(siteUrl);
  const res = await fetch(`${BASE}/${encoded}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("[gsc]", res.status, text);
    return null;
  }
  const data = (await res.json()) as {
    rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
  };
  return { rows: data.rows ?? [] };
}

/** Totali periodo: click, impressioni, CTR, posizione media */
export async function fetchGscOverview(days: number): Promise<GscOverview | null> {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return null;
  const { startDate, endDate } = formatDateRange(days);
  const result = await querySearchAnalytics(siteUrl, {
    startDate,
    endDate,
    rowLimit: 1,
  });
  if (!result || result.rows.length === 0) {
    return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  }
  const r = result.rows[0];
  return {
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  };
}

/** Performance per pagina (URL) – per incrocio con GA4 */
export async function fetchGscByPage(
  days: number,
  limit: number = 100
): Promise<GscPageRow[] | null> {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return null;
  const { startDate, endDate } = formatDateRange(days);
  const result = await querySearchAnalytics(siteUrl, {
    startDate,
    endDate,
    dimensions: ["page"],
    rowLimit: limit,
    aggregationType: "byPage",
  });
  if (!result) return null;
  return result.rows.map((r) => ({
    page: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}

/** Performance per query di ricerca */
export async function fetchGscByQuery(
  days: number,
  limit: number = 50
): Promise<GscQueryRow[] | null> {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return null;
  const { startDate, endDate } = formatDateRange(days);
  const result = await querySearchAnalytics(siteUrl, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: limit,
  });
  if (!result) return null;
  return result.rows.map((r) => ({
    query: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}

/** Serie temporale (per grafico) */
export async function fetchGscByDate(days: number): Promise<GscDateRow[] | null> {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return null;
  const { startDate, endDate } = formatDateRange(days);
  const result = await querySearchAnalytics(siteUrl, {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: 500,
  });
  if (!result) return null;
  const sorted = [...result.rows].sort(
    (a, b) => (a.keys?.[0] ?? "").localeCompare(b.keys?.[0] ?? "")
  );
  return sorted.map((r) => ({
    date: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}
