import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { JWT } from "google-auth-library";

export type Ga4Stats = {
  sessions: number;
  screenPageViews: number;
  activeUsers: number;
  newUsers: number;
  averageSessionDuration: number;
};

/** Utenti attivi per minuto (0 = corrente, 1 = un minuto fa, ...) – Realtime API */
export type RealtimeMinuteRow = { minutesAgo: number; activeUsers: number };

/** Acquisizione per canale */
export type AcquisitionRow = { channel: string; sessions: number; newUsers: number };

/** Referral per fonte */
export type ReferralRow = { source: string; sessions: number };

/** Serie temporale engagement (per grafico) */
export type EngagementDayRow = {
  date: string;
  sessions: number;
  engagedSessions: number;
  engagementRate: number;
  averageEngagementTimePerSession: number;
  screenPageViews: number;
};

/** Totali engagement */
export type EngagementTotals = {
  engagementRate: number;
  engagedSessions: number;
  averageEngagementTimePerSession: number;
};

/** Utenti attivi per paese (per mappa e tabella) */
export type CountryActiveUsersRow = { countryId: string; country: string; activeUsers: number };

/** Dettaglio pagine: titolo, URL e metriche (come report Pagine e schermi GA4) */
export type PageViewsRow = {
  pageTitle: string;
  fullPageUrl: string;
  screenPageViews: number;
  activeUsers: number;
  viewsPerActiveUser: number;
  averageEngagementTimePerSession: number; // secondi
  eventCount: number;
};

function getClient(): BetaAnalyticsDataClient | null {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.trim();
  if (!propertyId || !email || !key) return null;
  const privateKey = key.replace(/\\n/g, "\n");
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
  });
}

async function getAccessToken(): Promise<string | null> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.trim();
  if (!email || !key) return null;
  const privateKey = key.replace(/\\n/g, "\n");
  const jwt = new JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const credentials = await jwt.authorize();
  return credentials?.access_token ?? null;
}

/** Realtime: utenti attivi per minuto (ultimi 30 min) – REST v1beta (v1alpha può non essere disponibile) */
export async function fetchRealtimeByMinute(): Promise<RealtimeMinuteRow[] | null> {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;
  const token = await getAccessToken();
  if (!token) return null;
  const endpoints = [
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    `https://analyticsdata.googleapis.com/v1alpha/properties/${propertyId}:runRealtimeReport`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dimensions: [{ name: "minutesAgo" }],
            metrics: [{ name: "activeUsers" }],
            limit: 31,
            orderBys: [{ dimension: { dimensionName: "minutesAgo" }, desc: false }],
          }),
        }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        rows?: Array<{
          dimensionValues?: Array<{ value?: string }>;
          metricValues?: Array<{ value?: string }>;
        }>;
      };
      const rows = data.rows ?? [];
      return rows.map((r) => ({
        minutesAgo: parseInt(r.dimensionValues?.[0]?.value ?? "0", 10),
        activeUsers: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
      }));
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchGa4Stats(days: number = 30): Promise<Ga4Stats | null> {
  const client = getClient();
  if (!client) return null;
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;
  const endDate = "today";
  const startDate = days === 1 ? "today" : `${days}daysAgo`;
  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "activeUsers" },
        { name: "newUsers" },
        { name: "averageSessionDuration" },
      ],
    });
    const row = response.rows?.[0];
    if (!row || (row.metricValues?.length ?? 0) < 5) {
      return {
        sessions: 0,
        screenPageViews: 0,
        activeUsers: 0,
        newUsers: 0,
        averageSessionDuration: 0,
      };
    }
    const mv = row.metricValues ?? [];
    return {
      sessions: Number(mv[0]?.value ?? 0),
      screenPageViews: Number(mv[1]?.value ?? 0),
      activeUsers: Number(mv[2]?.value ?? 0),
      newUsers: Number(mv[3]?.value ?? 0),
      averageSessionDuration: Math.round(Number(mv[4]?.value ?? 0) || 0),
    };
  } catch (err) {
    console.error("[ga4]", err);
    return null;
  }
}

/** Acquisizione: sessioni e nuovi utenti per canale (sessionDefaultChannelGroup) */
export async function fetchAcquisition(
  days: number = 30
): Promise<AcquisitionRow[] | null> {
  const client = getClient();
  if (!client) return null;
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;
  const startDate = days === 1 ? "today" : `${days}daysAgo`;
  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: "today" }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "newUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 15,
    });
    return (response.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? "(not set)",
      sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
      newUsers: parseInt(r.metricValues?.[1]?.value ?? "0", 10),
    }));
  } catch (err) {
    console.error("[ga4 acquisition]", err);
    return null;
  }
}

/** Referral: sessioni per fonte (sessionSource) */
export async function fetchReferral(
  days: number = 30
): Promise<ReferralRow[] | null> {
  const client = getClient();
  if (!client) return null;
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;
  const startDate = days === 1 ? "today" : `${days}daysAgo`;
  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: "today" }],
      dimensions: [{ name: "sessionSource" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 15,
    });
    return (response.rows ?? []).map((r) => ({
      source: r.dimensionValues?.[0]?.value ?? "(not set)",
      sessions: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
    }));
  } catch (err) {
    console.error("[ga4 referral]", err);
    return null;
  }
}

/** Serie giornaliera per grafico coinvolgimento (date + metriche engagement) */
export async function fetchEngagementTimeSeries(
  days: number = 30
): Promise<EngagementDayRow[] | null> {
  const client = getClient();
  if (!client) return null;
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;
  const startDate = days === 1 ? "today" : `${days}daysAgo`;
  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: "today" }],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "sessions" },
        { name: "engagedSessions" },
        { name: "engagementRate" },
        { name: "averageEngagementTimePerSession" },
        { name: "screenPageViews" },
      ],
      orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
    });
    return (response.rows ?? []).map((r) => {
      const dateStr = r.dimensionValues?.[0]?.value ?? "";
      const sessions = parseInt(r.metricValues?.[0]?.value ?? "0", 10);
      const engagedSessions = parseInt(r.metricValues?.[1]?.value ?? "0", 10);
      const engagementRate = parseFloat(r.metricValues?.[2]?.value ?? "0") * 100;
      const avgEng = Math.round(
        parseFloat(r.metricValues?.[3]?.value ?? "0") || 0
      );
      const screenPageViews = parseInt(r.metricValues?.[4]?.value ?? "0", 10);
      return {
        date:
          dateStr.length === 8
            ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
            : dateStr,
        sessions,
        engagedSessions,
        engagementRate,
        averageEngagementTimePerSession: avgEng,
        screenPageViews,
      };
    });
  } catch (err) {
    console.error("[ga4 engagement series]", err);
    return null;
  }
}

/** Totali engagement (engagement rate, sessioni coinvolte, tempo medio) */
export async function fetchEngagementTotals(
  days: number = 30
): Promise<EngagementTotals | null> {
  const client = getClient();
  if (!client) return null;
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;
  const startDate = days === 1 ? "today" : `${days}daysAgo`;
  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: "today" }],
      metrics: [
        { name: "engagementRate" },
        { name: "engagedSessions" },
        { name: "averageEngagementTimePerSession" },
      ],
    });
    const row = response.rows?.[0];
    if (!row || (row.metricValues?.length ?? 0) < 3)
      return {
        engagementRate: 0,
        engagedSessions: 0,
        averageEngagementTimePerSession: 0,
      };
    const emv = row.metricValues ?? [];
    return {
      engagementRate:
        Math.round(parseFloat(emv[0]?.value ?? "0") * 10000) / 100,
      engagedSessions: parseInt(emv[1]?.value ?? "0", 10),
      averageEngagementTimePerSession: Math.round(
        parseFloat(emv[2]?.value ?? "0") || 0
      ),
    };
  } catch (err) {
    console.error("[ga4 engagement totals]", err);
    return null;
  }
}

/** Sessioni da ricerca organica (canale Organic Search) – non sono “impressioni” (quelle sono in Search Console) */
export async function fetchOrganicSearchSessions(
  days: number = 30
): Promise<{ sessions: number; screenPageViews: number } | null> {
  const client = getClient();
  if (!client) return null;
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;
  const startDate = days === 1 ? "today" : `${days}daysAgo`;
  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: "today" }],
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
      dimensionFilter: {
        filter: {
          fieldName: "sessionDefaultChannelGroup",
          stringFilter: { matchType: "EXACT", value: "Organic Search" },
        },
      },
    });
    const row = response.rows?.[0];
    if (!row)
      return { sessions: 0, screenPageViews: 0 };
    return {
      sessions: parseInt(row.metricValues?.[0]?.value ?? "0", 10),
      screenPageViews: parseInt(row.metricValues?.[1]?.value ?? "0", 10),
    };
  } catch (err) {
    console.error("[ga4 organic]", err);
    return null;
  }
}

/** Utenti attivi per paese (countryId ISO 2 + country name) – per mappa e tabella */
export async function fetchCountriesActiveUsers(
  days: number = 30
): Promise<CountryActiveUsersRow[] | null> {
  const client = getClient();
  if (!client) return null;
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;
  const startDate = days === 1 ? "today" : `${days}daysAgo`;
  try {
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: "today" }],
      dimensions: [{ name: "countryId" }, { name: "country" }],
      metrics: [{ name: "activeUsers" }],
      orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
      limit: 50,
    });
    return (response.rows ?? []).map((r) => ({
      countryId: (r.dimensionValues?.[0]?.value ?? "").toUpperCase(),
      country: r.dimensionValues?.[1]?.value ?? "(not set)",
      activeUsers: parseInt(r.metricValues?.[0]?.value ?? "0", 10),
    }));
  } catch (err) {
    console.error("[ga4 countries]", err);
    return null;
  }
}

/** Report pagine e schermi: titolo, (URL se disponibile), visualizzazioni, utenti attivi, durata, eventi */
export async function fetchPagesReport(
  days: number = 30,
  limit: number = 28
): Promise<PageViewsRow[] | null> {
  const client = getClient();
  if (!client) return null;
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  if (!propertyId) return null;
  const startDate = days === 1 ? "today" : `${days}daysAgo`;
  const baseRequest = {
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate: "today" }],
    metrics: [
      { name: "screenPageViews" },
      { name: "activeUsers" },
      { name: "averageEngagementTimePerSession" },
      { name: "eventCount" },
    ],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit,
  };

  const mapRow = (
    r: { dimensionValues?: Array<{ value?: string | null }> | null; metricValues?: Array<{ value?: string | null }> | null },
    hasUrl: boolean
  ): PageViewsRow => {
    const views = parseInt(r.metricValues?.[0]?.value ?? "0", 10);
    const users = parseInt(r.metricValues?.[1]?.value ?? "0", 10);
    const avgEng = Math.round(
      parseFloat(r.metricValues?.[2]?.value ?? "0") || 0
    );
    const events = parseInt(r.metricValues?.[3]?.value ?? "0", 10);
    return {
      pageTitle: r.dimensionValues?.[0]?.value ?? "(not set)",
      fullPageUrl: hasUrl ? (r.dimensionValues?.[1]?.value ?? "") : "",
      screenPageViews: views,
      activeUsers: users,
      viewsPerActiveUser: users > 0 ? Math.round((views / users) * 100) / 100 : 0,
      averageEngagementTimePerSession: avgEng,
      eventCount: events,
    };
  };

  try {
    const [responseWithUrl] = await client.runReport({
      ...baseRequest,
      dimensions: [{ name: "pageTitle" }, { name: "fullPageUrl" }],
    });
    const rows = responseWithUrl.rows ?? [];
    if (rows.length > 0) {
      return rows.map((r) => mapRow(r, true));
    }
  } catch {
    /* fullPageUrl può non essere supportato (es. app-only); riprova solo pageTitle */
  }

  try {
    const [response] = await client.runReport({
      ...baseRequest,
      dimensions: [{ name: "pageTitle" }],
    });
    return (response.rows ?? []).map((r) => mapRow(r, false));
  } catch (err) {
    console.error("[ga4 pages]", err);
    return null;
  }
}
