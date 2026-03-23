/**
 * Google AdSense Management API – report guadagni e performance.
 *
 * Consigliato: OAuth con refresh token (stesso Account Google che ha accesso AdSense, es. info@…).
 * Google indica il flusso “installed app” / OAuth utente; un service account non può accettare
 * l’invito email in AdSense e resta “In attesa” → 403 permanente.
 * Vedi: https://developers.google.com/adsense/management/direct_requests (Authorizing requests)
 *
 * Opzionale: JWT service account (solo se Google/AdSense lo attiva davvero come “Attivo”).
 * Abilita "AdSense Management API" nel progetto Cloud dell’OAuth client o della chiave JWT.
 */

import { JWT, OAuth2Client } from "google-auth-library";

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

export type AdSenseFetchResult = {
  overview: AdSenseOverview | null;
  byDate: AdSenseDayRow[] | null;
  /** Messaggio leggibile se overview non disponibile (debug / supporto). */
  error?: string;
};

type ReportHeader = { name?: string; type?: string; currencyCode?: string };
type ReportRow = { cells?: Array<{ value?: string }> };

type ParsedReport = {
  headers: ReportHeader[];
  rows: ReportRow[];
  totals?: ReportRow;
  warnings?: string[];
};

function adsenseOAuthConfigured(): boolean {
  return Boolean(
    process.env.ADSENSE_OAUTH_CLIENT_ID?.trim() &&
      process.env.ADSENSE_OAUTH_CLIENT_SECRET?.trim() &&
      process.env.ADSENSE_OAUTH_REFRESH_TOKEN?.trim()
  );
}

async function getAccessTokenViaOAuth(): Promise<string | null> {
  const clientId = process.env.ADSENSE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.ADSENSE_OAUTH_CLIENT_SECRET?.trim();
  const refreshToken = process.env.ADSENSE_OAUTH_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) return null;
  try {
    const client = new OAuth2Client(clientId, clientSecret);
    client.setCredentials({ refresh_token: refreshToken });
    const res = await client.getAccessToken();
    const token = res?.token ?? null;
    return token ?? null;
  } catch (e) {
    console.error("[adsense oauth]", e);
    return null;
  }
}

async function getAccessTokenViaJwt(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.trim();
  if (!email || !key) return null;
  try {
    const privateKey = key.replace(/\\n/g, "\n");
    const jwt = new JWT({
      email,
      key: privateKey,
      scopes: [SCOPE],
    });
    const credentials = await jwt.authorize();
    return credentials?.access_token ?? null;
  } catch (e) {
    console.error("[adsense jwt]", e);
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  if (adsenseOAuthConfigured()) {
    return getAccessTokenViaOAuth();
  }
  return getAccessTokenViaJwt();
}

function normalizeAdsenseAccountId(raw: string): string {
  const s = raw.trim();
  if (s.startsWith("accounts/")) return s.slice("accounts/".length);
  return s;
}

function getAccountIdFromEnv(): string | null {
  const v = process.env.ADSENSE_ACCOUNT_ID?.trim();
  return v ? normalizeAdsenseAccountId(v) : null;
}

async function listAccountIds(token: string): Promise<{ ok: true; ids: string[] } | { ok: false; message: string }> {
  const res = await fetch(`${BASE}/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[adsense list]", res.status, text);
    return { ok: false, message: adsenseApiErrorMessage(res.status, text) };
  }
  try {
    const data = JSON.parse(text) as { accounts?: Array<{ name: string }> };
    const accounts = data.accounts ?? [];
    const ids = accounts.map((a) => normalizeAdsenseAccountId(a.name));
    return { ok: true, ids };
  } catch {
    return { ok: false, message: "Risposta non valida dall’API elenco account AdSense." };
  }
}

function compactApiError(status: number, body: string, max = 280): string {
  try {
    const j = JSON.parse(body) as { error?: { message?: string; status?: string } };
    const msg = j.error?.message;
    if (msg) return `${status}: ${msg}`;
  } catch {
    /* ignore */
  }
  const t = body.replace(/\s+/g, " ").trim();
  return t.length <= max ? `${status}: ${t || "Errore sconosciuto"}` : `${status}: ${t.slice(0, max)}…`;
}

/** Spiegazione operativa per il 403 tipico (service account / API / account sbagliato). */
function adsenseApiErrorMessage(status: number, body: string): string {
  const base = compactApiError(status, body);
  if (status !== 403) return base;
  const hint =
    " — Se usi il service account: in AdSense l’invito resta spesso «In attesa» perché quell’identità non può aprire l’email e accettare l’invito (lo richiede la guida AdSense per gli utenti). In quel caso usa OAuth: imposta ADSENSE_OAUTH_CLIENT_ID, ADSENSE_OAUTH_CLIENT_SECRET e ADSENSE_OAUTH_REFRESH_TOKEN (account Google già attivo su AdSense, es. l’admin). Altrimenti: API «Google AdSense Management API» abilitata nel progetto Cloud delle credenziali; ADSENSE_ACCOUNT_ID = pub-… corretto se impostato.";
  return base + hint;
}

async function resolveAccountId(token: string): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const configured = getAccountIdFromEnv();
  if (configured) return { ok: true, id: configured };
  const listed = await listAccountIds(token);
  if (!listed.ok) return listed;
  if (listed.ids.length === 0) {
    return {
      ok: false,
      message:
        "Nessun account AdSense visibile: aggiungi il service account in AdSense (Impostazioni → Accesso e autorizzazione, accesso Solo report) e abilita AdSense Management API nel progetto Google Cloud.",
    };
  }
  return { ok: true, id: listed.ids[0] };
}

function dateToParams(start: Date, end: Date): Record<string, string> {
  return {
    dateRange: "CUSTOM",
    "startDate.year": String(start.getFullYear()),
    "startDate.month": String(start.getMonth() + 1),
    "startDate.day": String(start.getDate()),
    "endDate.year": String(end.getFullYear()),
    "endDate.month": String(end.getMonth() + 1),
    "endDate.day": String(end.getDate()),
  };
}

async function generateReport(
  token: string,
  accountId: string,
  days: number,
  dimensions: string[],
  metrics: string[]
): Promise<{ ok: true; data: ParsedReport } | { ok: false; message: string }> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - Math.max(0, days - 1));
  const params = new URLSearchParams(dateToParams(start, end));
  dimensions.forEach((d) => params.append("dimensions", d));
  metrics.forEach((m) => params.append("metrics", m));
  const url = `${BASE}/accounts/${encodeURIComponent(accountId)}/reports:generate?${params.toString()}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("[adsense report]", res.status, text);
    return { ok: false, message: adsenseApiErrorMessage(res.status, text) };
  }
  try {
    const data = JSON.parse(text) as {
      headers?: ReportHeader[];
      rows?: ReportRow[];
      totals?: ReportRow;
      warnings?: string[];
    };
    if (data.warnings?.length) {
      console.warn("[adsense report warnings]", data.warnings.join("; "));
    }
    return {
      ok: true,
      data: {
        headers: data.headers ?? [],
        rows: data.rows ?? [],
        totals: data.totals,
        warnings: data.warnings,
      },
    };
  } catch {
    return { ok: false, message: "Risposta report AdSense non valida (JSON)." };
  }
}

function headerIndex(headers: ReportHeader[], name: string): number {
  return headers.findIndex((h) => h.name === name);
}

function cellValue(cells: Array<{ value?: string } | undefined>, i: number): string {
  if (i < 0) return "0";
  return cells[i]?.value ?? "0";
}

/**
 * Usa l’ordine degli header: le celle totals/righe allineano alle colonne (dimensioni prima, poi metriche).
 * Evita errori quando la riga totals ha celle vuote per le dimensioni (vedi documentazione Google).
 */
function overviewFromParsed(data: ParsedReport): AdSenseOverview | null {
  const headers = data.headers ?? [];
  const cells = data.totals?.cells ?? [];

  const ie = headerIndex(headers, "ESTIMATED_EARNINGS");
  const ipv = headerIndex(headers, "PAGE_VIEWS");
  const ic = headerIndex(headers, "CLICKS");
  const ii = headerIndex(headers, "IMPRESSIONS");
  const ict = headerIndex(headers, "IMPRESSIONS_CTR");
  const irpm = headerIndex(headers, "PAGE_VIEWS_RPM");

  if (ie >= 0 && cells.length > ie) {
    const currencyCode = headers[ie]?.currencyCode?.trim() || "EUR";
    return {
      estimatedEarnings: parseFloat(cellValue(cells, ie)) || 0,
      pageViews: parseInt(cellValue(cells, ipv), 10) || 0,
      clicks: parseInt(cellValue(cells, ic), 10) || 0,
      impressions: parseInt(cellValue(cells, ii), 10) || 0,
      ctr: parseFloat(cellValue(cells, ict)) || 0,
      pageViewsRpm: parseFloat(cellValue(cells, irpm)) || 0,
      currencyCode,
    };
  }

  /* Fallback: nessun header (improbabile) — ordine richiesto come in richiesta */
  if (cells.length >= 6 && headers.length === 0) {
    return {
      estimatedEarnings: parseFloat(cellValue(cells, 0)) || 0,
      pageViews: parseInt(cellValue(cells, 1), 10) || 0,
      clicks: parseInt(cellValue(cells, 2), 10) || 0,
      impressions: parseInt(cellValue(cells, 3), 10) || 0,
      ctr: parseFloat(cellValue(cells, 4)) || 0,
      pageViewsRpm: parseFloat(cellValue(cells, 5)) || 0,
      currencyCode: "EUR",
    };
  }

  return null;
}

function byDateFromParsed(data: ParsedReport): AdSenseDayRow[] {
  const headers = data.headers ?? [];
  const id = headerIndex(headers, "DATE");
  const ie = headerIndex(headers, "ESTIMATED_EARNINGS");
  const ipv = headerIndex(headers, "PAGE_VIEWS");
  const ic = headerIndex(headers, "CLICKS");
  const ii = headerIndex(headers, "IMPRESSIONS");

  return (data.rows ?? []).map((r) => {
    const c = r.cells ?? [];
    if (id >= 0 && ie >= 0) {
      return {
        date: cellValue(c, id),
        estimatedEarnings: parseFloat(cellValue(c, ie)) || 0,
        pageViews: parseInt(cellValue(c, ipv), 10) || 0,
        clicks: parseInt(cellValue(c, ic), 10) || 0,
        impressions: parseInt(cellValue(c, ii), 10) || 0,
      };
    }
    return {
      date: cellValue(c, 0),
      estimatedEarnings: parseFloat(cellValue(c, 1)) || 0,
      pageViews: parseInt(cellValue(c, 2), 10) || 0,
      clicks: parseInt(cellValue(c, 3), 10) || 0,
      impressions: parseInt(cellValue(c, 4), 10) || 0,
    };
  });
}

/** Una sola autenticazione e un solo resolve account; parsing allineato agli header. */
export async function fetchAdSenseAll(days: number): Promise<AdSenseFetchResult> {
  const token = await getAccessToken();
  if (!token) {
    return {
      overview: null,
      byDate: null,
      error: adsenseOAuthConfigured()
        ? "OAuth AdSense non valido o refresh token revocato: verifica ADSENSE_OAUTH_CLIENT_ID, ADSENSE_OAUTH_CLIENT_SECRET e ADSENSE_OAUTH_REFRESH_TOKEN (rigenera con npm run adsense-oauth nella cartella admin)."
        : "Credenziali AdSense mancanti o incomplete: preferisci OAuth (ADSENSE_OAUTH_CLIENT_ID, ADSENSE_OAUTH_CLIENT_SECRET, ADSENSE_OAUTH_REFRESH_TOKEN) con l’Account Google già attivo in AdSense; in alternativa GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY se l’accesso API risulta davvero «Attivo» in AdSense.",
    };
  }

  const account = await resolveAccountId(token);
  if (!account.ok) {
    return { overview: null, byDate: null, error: account.message };
  }

  const metricsOverview = [
    "ESTIMATED_EARNINGS",
    "PAGE_VIEWS",
    "CLICKS",
    "IMPRESSIONS",
    "IMPRESSIONS_CTR",
    "PAGE_VIEWS_RPM",
  ];
  const overviewRes = await generateReport(token, account.id, days, [], metricsOverview);
  if (!overviewRes.ok) {
    return { overview: null, byDate: null, error: overviewRes.message };
  }

  const overview = overviewFromParsed(overviewRes.data);
  if (!overview) {
    return {
      overview: null,
      byDate: null,
      error: "Report AdSense senza totali utilizzabili (struttura risposta imprevista).",
    };
  }

  const byDateRes = await generateReport(token, account.id, days, ["DATE"], [
    "ESTIMATED_EARNINGS",
    "PAGE_VIEWS",
    "CLICKS",
    "IMPRESSIONS",
  ]);

  if (!byDateRes.ok) {
    return {
      overview,
      byDate: [],
      error: `Dati giornalieri non disponibili: ${byDateRes.message}`,
    };
  }

  return { overview, byDate: byDateFromParsed(byDateRes.data) };
}
