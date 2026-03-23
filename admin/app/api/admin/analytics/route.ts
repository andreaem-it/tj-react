import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import {
  fetchGa4Stats,
  fetchRealtimeByMinute,
  fetchAcquisition,
  fetchReferral,
  fetchEngagementTimeSeries,
  fetchEngagementTotals,
  fetchOrganicSearchSessions,
  fetchCountriesActiveUsers,
  fetchPagesReport,
} from "@/lib/ga4";
import {
  fetchGscOverview,
  fetchGscByPage,
  fetchGscByQuery,
  fetchGscByDate,
} from "@/lib/searchconsole";
import { fetchAdSenseAll } from "@/lib/adsense";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days")) || 30));

  const [
    overview,
    realtime,
    acquisition,
    referral,
    engagementSeries,
    engagementTotals,
    organicSearch,
    usersByCountry,
    pagesDetail,
    gscOverview,
    gscByPage,
    gscByQuery,
    gscByDate,
    adSenseBundle,
  ] = await Promise.all([
    fetchGa4Stats(days),
    fetchRealtimeByMinute(),
    fetchAcquisition(days),
    fetchReferral(days),
    fetchEngagementTimeSeries(days),
    fetchEngagementTotals(days),
    fetchOrganicSearchSessions(days),
    fetchCountriesActiveUsers(days),
    fetchPagesReport(days, 50),
    fetchGscOverview(days),
    fetchGscByPage(days, 100),
    fetchGscByQuery(days, 50),
    fetchGscByDate(days),
    fetchAdSenseAll(days),
  ]);

  if (overview === null) {
    return NextResponse.json(
      {
        configured: false,
        message:
          "Configura GA4_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY in .env.local. Property ID numerico da GA4 (Admin → Impostazioni proprietà).",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    configured: true,
    days,
    overview: {
      sessions: overview.sessions,
      screenPageViews: overview.screenPageViews,
      activeUsers: overview.activeUsers,
      newUsers: overview.newUsers,
      averageSessionDuration: overview.averageSessionDuration,
    },
    realtime: realtime ?? [],
    acquisition: acquisition ?? [],
    referral: referral ?? [],
    engagementSeries: engagementSeries ?? [],
    engagementTotals: engagementTotals ?? {
      engagementRate: 0,
      engagedSessions: 0,
      averageEngagementTimePerSession: 0,
    },
    organicSearch: organicSearch ?? { sessions: 0, screenPageViews: 0 },
    usersByCountry: usersByCountry ?? [],
    pagesDetail: pagesDetail ?? [],
    searchConsole:
      gscOverview !== null
        ? {
            configured: true,
            overview: gscOverview,
            byPage: gscByPage ?? [],
            byQuery: gscByQuery ?? [],
            byDate: gscByDate ?? [],
            pagesCrossReference: buildPagesCrossReference(pagesDetail ?? [], gscByPage ?? []),
          }
        : { configured: false },
    adSense:
      adSenseBundle.overview !== null
        ? {
            configured: true,
            overview: adSenseBundle.overview,
            byDate: adSenseBundle.byDate ?? [],
            ...(adSenseBundle.error ? { warning: adSenseBundle.error } : {}),
          }
        : {
            configured: false,
            ...(adSenseBundle.error ? { error: adSenseBundle.error } : {}),
          },
  });
}

/** Normalizza URL per confronto (trailing slash, lowercase). */
function normalizeUrl(u: string): string {
  const s = (u || "").trim().toLowerCase();
  return s.endsWith("/") && s.length > 1 ? s.slice(0, -1) : s;
}

/** Incrocio GA4 pagine + GSC per URL (stesso periodo). */
function buildPagesCrossReference(
  ga4Pages: Array<{ pageTitle: string; fullPageUrl: string; screenPageViews: number; activeUsers: number; viewsPerActiveUser: number; averageEngagementTimePerSession: number; eventCount: number }>,
  gscPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>
): Array<{
  pageTitle: string;
  fullPageUrl: string;
  ga4Views: number;
  ga4Users: number;
  gscClicks: number;
  gscImpressions: number;
  gscCtr: number;
  gscPosition: number;
}> {
  const byUrl = new Map(
    gscPages.map((r) => [normalizeUrl(r.page), r])
  );
  return ga4Pages.map((p) => {
    const url = normalizeUrl(p.fullPageUrl);
    const gsc = byUrl.get(url) ?? null;
    return {
      pageTitle: p.pageTitle,
      fullPageUrl: p.fullPageUrl,
      ga4Views: p.screenPageViews,
      ga4Users: p.activeUsers,
      gscClicks: gsc?.clicks ?? 0,
      gscImpressions: gsc?.impressions ?? 0,
      gscCtr: gsc?.ctr ?? 0,
      gscPosition: gsc?.position ?? 0,
    };
  });
}
