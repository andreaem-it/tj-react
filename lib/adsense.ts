/**
 * Google AdSense Management API – report guadagni e performance.
 * Stesse credenziali GA4/GSC (service account). In AdSense: Impostazioni → Accesso e autorizzazione
 * → Aggiungi l’email del service account come utente con accesso “Solo report”.
 * In Google Cloud abilita "AdSense Management API".
 */

import { JWT } from "google-auth-library";

const SCOPE = "https://www.googleapis.com/auth/adsense.readonly";
const BASE = "https://adsense.googleapis.com/v2";

export type AdSenseOverview = {
  estimatedEarnings: number;
  pageViews: number;
  clicks: number;
  impressions: number;
  ctr: number;
  pageViewsRpm: number;
  currencyCode: string;
};

export type AdSenseDayRow = {
  date: string;
  estimatedEarnings: number;
  pageViews: number;
  clicks: number;
  impressions: number;
};

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

function getAccountId(): string | null {
  return process.env.ADSENSE_ACCOUNT_ID?.trim() || null;
}

async function listAccountIds(): Promise<string[]> {
  const token = await getAccessToken();
  if (!token) return [];
  const res = await fetch(`${BASE}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error("[adsense list]", res.status, await res.text());
    return [];
  }
  const data = (await res.json()) as { accounts?: Array<{ name: string }> };
  const accounts = data.accounts ?? [];
  return accounts.map((a) => a.name.replace("accounts/", ""));
}

async function getAccountIdToUse(): Promise<string | null> {
  const configured = getAccountId();
  if (configured) return configured;
  const ids = await listAccountIds();
  return ids[0] ?? null;
}

function dateToParams(start: Date, end: Date): Record<string, string> {
  return {
    "startDate.year": String(start.getFullYear()),
    "startDate.month": String(start.getMonth() + 1),
    "startDate.day": String(start.getDate()),
    "endDate.year": String(end.getFullYear()),
    "endDate.month": String(end.getMonth() + 1),
    "endDate.day": String(end.getDate()),
  };
}

type ReportRow = { cells: Array<{ value?: string }> };

async function generateReport(
  accountId: string,
  days: number,
  dimensions: string[],
  metrics: string[]
): Promise<{ headers: Array<{ name: string }>; rows: ReportRow[]; totals?: ReportRow } | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - Math.max(0, days - 1));
  const params = new URLSearchParams(dateToParams(start, end));
  dimensions.forEach((d) => params.append("dimensions", d));
  metrics.forEach((m) => params.append("metrics", m));
  const url = `${BASE}/accounts/${accountId}/reports:generate?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error("[adsense report]", res.status, await res.text());
    return null;
  }
  const data = (await res.json()) as {
    headers?: Array<{ name: string }>;
    rows?: ReportRow[];
    totals?: ReportRow;
  };
  return {
    headers: data.headers ?? [],
    rows: data.rows ?? [],
    totals: data.totals,
  };
}

/** Totali periodo: guadagni, page views, click, impressioni, CTR, RPM (usa riga totals dell’API). */
export async function fetchAdSenseOverview(days: number): Promise<AdSenseOverview | null> {
  const accountId = await getAccountIdToUse();
  if (!accountId) return null;
  const metrics = [
    "ESTIMATED_EARNINGS",
    "PAGE_VIEWS",
    "CLICKS",
    "IMPRESSIONS",
    "IMPRESSIONS_CTR",
    "PAGE_VIEWS_RPM",
  ];
  const result = await generateReport(accountId, days, [], metrics);
  if (!result) return null;
  const totals = result.totals?.cells ?? [];
  if (totals.length < 6) {
    return { estimatedEarnings: 0, pageViews: 0, clicks: 0, impressions: 0, ctr: 0, pageViewsRpm: 0, currencyCode: "EUR" };
  }
  return {
    estimatedEarnings: parseFloat(totals[0]?.value ?? "0") || 0,
    pageViews: parseInt(totals[1]?.value ?? "0", 10) || 0,
    clicks: parseInt(totals[2]?.value ?? "0", 10) || 0,
    impressions: parseInt(totals[3]?.value ?? "0", 10) || 0,
    ctr: parseFloat(totals[4]?.value ?? "0") || 0,
    pageViewsRpm: parseFloat(totals[5]?.value ?? "0") || 0,
    currencyCode: "EUR",
  };
}

/** Serie giornaliera per grafico. */
export async function fetchAdSenseByDate(days: number): Promise<AdSenseDayRow[] | null> {
  const accountId = await getAccountIdToUse();
  if (!accountId) return null;
  const result = await generateReport(accountId, days, ["DATE"], [
    "ESTIMATED_EARNINGS",
    "PAGE_VIEWS",
    "CLICKS",
    "IMPRESSIONS",
  ]);
  if (!result) return null;
  return (result.rows ?? []).map((r) => {
    const c = r.cells ?? [];
    return {
      date: c[0]?.value ?? "",
      estimatedEarnings: parseFloat(c[1]?.value ?? "0") || 0,
      pageViews: parseInt(c[2]?.value ?? "0", 10) || 0,
      clicks: parseInt(c[3]?.value ?? "0", 10) || 0,
      impressions: parseInt(c[4]?.value ?? "0", 10) || 0,
    };
  });
}
