"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import dynamic from "next/dynamic";

const WorldMapByCountry = dynamic(
  () => import("@/components/admin/WorldMapByCountry").then((m) => m.default),
  { ssr: false }
);

type Ga4Response =
  | {
      configured: true;
      days: number;
      overview: {
        sessions: number;
        screenPageViews: number;
        activeUsers: number;
        newUsers: number;
        averageSessionDuration: number;
      };
      realtime: Array<{ minutesAgo: number; activeUsers: number }>;
      acquisition: Array<{ channel: string; sessions: number; newUsers: number }>;
      referral: Array<{ source: string; sessions: number }>;
      engagementSeries: Array<{
        date: string;
        sessions: number;
        engagedSessions: number;
        engagementRate: number;
        averageEngagementTimePerSession: number;
        screenPageViews: number;
      }>;
      engagementTotals: {
        engagementRate: number;
        engagedSessions: number;
        averageEngagementTimePerSession: number;
      };
      organicSearch: { sessions: number; screenPageViews: number };
      usersByCountry: Array<{ countryId: string; country: string; activeUsers: number }>;
      pagesDetail: Array<{
        pageTitle: string;
        fullPageUrl: string;
        screenPageViews: number;
        activeUsers: number;
        viewsPerActiveUser: number;
        averageEngagementTimePerSession: number;
        eventCount: number;
      }>;
      searchConsole:
        | {
            configured: true;
            overview: { clicks: number; impressions: number; ctr: number; position: number };
            byPage: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
            byQuery: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
            byDate: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>;
            pagesCrossReference: Array<{
              pageTitle: string;
              fullPageUrl: string;
              ga4Views: number;
              ga4Users: number;
              gscClicks: number;
              gscImpressions: number;
              gscCtr: number;
              gscPosition: number;
            }>;
          }
        | { configured: false };
      adSense:
        | {
            configured: true;
            overview: {
              estimatedEarnings: number;
              pageViews: number;
              clicks: number;
              impressions: number;
              ctr: number;
              pageViewsRpm: number;
              currencyCode: string;
            };
            byDate: Array<{
              date: string;
              estimatedEarnings: number;
              pageViews: number;
              clicks: number;
              impressions: number;
            }>;
            warning?: string;
          }
        | { configured: false; error?: string };
    }
  | { configured: false; message: string };

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50] as const;

type PageRow = {
  pageTitle: string;
  fullPageUrl?: string;
  screenPageViews: number;
  activeUsers: number;
  viewsPerActiveUser: number;
  averageEngagementTimePerSession: number;
  eventCount: number;
};

function PagesDetailTable({
  pages,
  totalViews,
  totalUsers,
  formatDuration,
}: {
  pages: PageRow[];
  totalViews: number;
  totalUsers: number;
  formatDuration: (s: number) => string;
}) {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const totalPages = Math.max(1, Math.ceil(pages.length / rowsPerPage));
  const start = (page - 1) * rowsPerPage;
  const slice = useMemo(
    () => pages.slice(start, start + rowsPerPage),
    [pages, start, rowsPerPage]
  );
  const totalEvents = useMemo(
    () => pages.reduce((acc, p) => acc + p.eventCount, 0),
    [pages]
  );
  const avgEngagement =
    pages.length > 0
      ? Math.round(
          pages.reduce((acc, p) => acc + p.averageEngagementTimePerSession, 0) / pages.length
        )
      : 0;
  const viewsPerUserTotal = totalUsers > 0 ? Math.round((totalViews / totalUsers) * 100) / 100 : 0;

  if (pages.length === 0) {
    return (
      <p className="text-sm text-white/50 py-4">Nessun dato pagine per il periodo selezionato.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-white/60 border-b border-white/10">
            <th className="text-left py-2 pr-4 font-medium">Titolo pagina</th>
            <th className="text-right py-2 px-2 font-medium">Visualizzazioni</th>
            <th className="text-right py-2 px-2 font-medium">Utenti attivi</th>
            <th className="text-right py-2 px-2 font-medium">Viz/utente</th>
            <th className="text-right py-2 px-2 font-medium">Durata media</th>
            <th className="text-right py-2 px-2 font-medium">Eventi</th>
            <th className="text-right py-2 pl-2 font-medium">Eventi chiave</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-white/5 border-b border-white/10 font-medium text-white">
            <td className="py-2 pr-4">Totale</td>
            <td className="text-right py-2 px-2">{totalViews.toLocaleString("it-IT")}</td>
            <td className="text-right py-2 px-2">{totalUsers.toLocaleString("it-IT")}</td>
            <td className="text-right py-2 px-2">{viewsPerUserTotal.toLocaleString("it-IT")}</td>
            <td className="text-right py-2 px-2">{formatDuration(avgEngagement)}</td>
            <td className="text-right py-2 px-2">{totalEvents.toLocaleString("it-IT")}</td>
            <td className="text-right py-2 pl-2">–</td>
          </tr>
          {slice.map((row, i) => (
            <tr key={`${row.pageTitle}-${i}`} className="border-b border-white/10 text-white/90">
              <td className="py-2 pr-4 max-w-[200px] truncate" title={row.pageTitle}>
                {row.pageTitle}
              </td>
              <td className="text-right py-2 px-2">{row.screenPageViews.toLocaleString("it-IT")}</td>
              <td className="text-right py-2 px-2">{row.activeUsers.toLocaleString("it-IT")}</td>
              <td className="text-right py-2 px-2">{row.viewsPerActiveUser.toLocaleString("it-IT")}</td>
              <td className="text-right py-2 px-2">{formatDuration(row.averageEngagementTimePerSession)}</td>
              <td className="text-right py-2 px-2">{row.eventCount.toLocaleString("it-IT")}</td>
              <td className="text-right py-2 pl-2">–</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-sm text-white/70">
        <div className="flex items-center gap-2">
          <span>Righe per pagina:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
          >
            {ROWS_PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>
            {start + 1}-{Math.min(start + rowsPerPage, pages.length)} di {pages.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-2 py-1 rounded bg-white/10 disabled:opacity-50 text-white"
          >
            ‹
          </button>
          <span>
            Pagina {page} di {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-2 py-1 rounded bg-white/10 disabled:opacity-50 text-white"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

type TabId = "ga4" | "gsc" | "adsense";

const TAB_LABELS: Record<TabId, string> = {
  ga4: "Google Analytics 4",
  gsc: "Search Console",
  adsense: "AdSense",
};

export default function AdminDashboardStats() {
  const [data, setData] = useState<Ga4Response | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("ga4");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`)
      .then((res) => res.json())
      .then((d: Ga4Response) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
        Errore nel caricamento delle statistiche.
      </div>
    );
  }

  if (!data.configured) {
    return (
      <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm">
        <p className="font-medium text-white/90 mb-1">Statistiche Google Analytics</p>
        <p>{data.message}</p>
      </div>
    );
  }

  const {
    overview,
    realtime,
    acquisition,
    referral,
    engagementSeries,
    engagementTotals,
    organicSearch,
    usersByCountry,
    pagesDetail,
    searchConsole,
    adSense,
  } = data;

  const overviewCards = [
    { label: "Utenti attivi", value: overview.activeUsers.toLocaleString("it-IT"), sub: `ultimi ${days} giorni` },
    { label: "Sessioni", value: overview.sessions.toLocaleString("it-IT"), sub: `ultimi ${days} giorni` },
    { label: "Pagine viste", value: overview.screenPageViews.toLocaleString("it-IT"), sub: `ultimi ${days} giorni` },
    { label: "Nuovi utenti", value: overview.newUsers.toLocaleString("it-IT"), sub: `ultimi ${days} giorni` },
    { label: "Durata media sessione", value: formatDuration(overview.averageSessionDuration), sub: "media" },
  ];

  const realtimeChartData = [...realtime].reverse().map((r) => ({
    name: r.minutesAgo === 0 ? "ora" : `-${r.minutesAgo}m`,
    utenti: r.activeUsers,
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-sm shadow-lg">
        <p className="text-white/80">{label}</p>
        <p className="text-white font-medium">{payload[0]?.value ?? 0}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header: Dashboard a sinistra; titolo + periodo + tab a destra */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-white/80 font-medium">{TAB_LABELS[activeTab]}</span>
          <span className="text-white/40">|</span>
          <span className="text-sm text-white/60">Periodo:</span>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                days === d ? "bg-[#f5a623] text-[#1a1a1a]" : "bg-white/10 text-white/80 hover:bg-white/15"
              }`}
            >
              {d} giorni
            </button>
          ))}
          <span className="text-white/40">|</span>
          <div className="flex rounded-lg bg-white/5 border border-white/10 p-0.5">
            {(["ga4", "gsc", "adsense"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab ? "bg-[#f5a623] text-[#1a1a1a]" : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {tab === "ga4" ? "GA4" : tab === "gsc" ? "Search Console" : "AdSense"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scheda GA4 */}
      {activeTab === "ga4" && (
        <>
      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {overviewCards.map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-2xl font-semibold text-white">{s.value}</p>
            <p className="text-sm text-white/80 mt-0.5">{s.label}</p>
            <p className="text-xs text-white/50 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Griglia a 3 colonne (full width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonna 1: Realtime + Mappa paesi */}
        <div className="space-y-6">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Utenti attivi – ultimi 30 min</h2>
            {realtimeChartData.length === 0 ? (
              <p className="text-sm text-white/50 py-8 text-center">Nessun dato realtime</p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={realtimeChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                    <Bar dataKey="utenti" fill="#f5a623" radius={[2, 2, 0, 0]} name="Utenti" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Utenti da Paese</h2>
            <div className="min-h-[200px] rounded-lg overflow-hidden bg-white/5 mb-3">
              <WorldMapByCountry usersByCountry={usersByCountry} />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60 border-b border-white/10">
                  <th className="text-left py-1.5 font-medium">Paese</th>
                  <th className="text-right py-1.5 font-medium">Utenti</th>
                </tr>
              </thead>
              <tbody>
                {usersByCountry.slice(0, 6).map((row) => (
                  <tr key={row.countryId} className="border-b border-white/10 text-white/90">
                    <td className="py-1.5">{row.country}</td>
                    <td className="text-right py-1.5">{row.activeUsers.toLocaleString("it-IT")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Colonna 2: Acquisizione + Referral */}
        <div className="space-y-6">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Acquisizione – canale</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={acquisition} layout="vertical" margin={{ top: 8, right: 24, left: 72, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis type="category" dataKey="channel" stroke="rgba(255,255,255,0.5)" fontSize={10} width={68} />
                  <Tooltip contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                  <Bar dataKey="sessions" fill="#f5a623" radius={[0, 2, 2, 0]} name="Sessioni" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Referral</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={referral} layout="vertical" margin={{ top: 8, right: 24, left: 88, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                  <YAxis type="category" dataKey="source" stroke="rgba(255,255,255,0.5)" fontSize={10} width={82} />
                  <Tooltip contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                  <Bar dataKey="sessions" fill="#a78bfa" radius={[0, 2, 2, 0]} name="Sessioni" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Colonna 3: Coinvolgimento + Ricerca organica */}
        <div className="space-y-6">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h2 className="text-lg font-semibold text-white mb-4">Coinvolgimento</h2>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <p className="text-base font-semibold text-white">{engagementTotals.engagementRate}%</p>
                <p className="text-xs text-white/70">Tasso</p>
              </div>
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <p className="text-base font-semibold text-white">{engagementTotals.engagedSessions.toLocaleString("it-IT")}</p>
                <p className="text-xs text-white/70">Coinvolte</p>
              </div>
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <p className="text-base font-semibold text-white">{formatDuration(engagementTotals.averageEngagementTimePerSession)}</p>
                <p className="text-xs text-white/70">Tempo</p>
              </div>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagementSeries} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={9} tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="rgba(255,255,255,0.5)" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="sessions" stroke="#f5a623" strokeWidth={2} dot={false} name="Sessioni" />
                  <Line type="monotone" dataKey="engagedSessions" stroke="#22c55e" strokeWidth={2} dot={false} name="Coinvolte" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h2 className="text-lg font-semibold text-white mb-2">Ricerca organica</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xl font-semibold text-white">{organicSearch.sessions.toLocaleString("it-IT")}</p>
                <p className="text-xs text-white/70">Sessioni</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xl font-semibold text-white">{organicSearch.screenPageViews.toLocaleString("it-IT")}</p>
                <p className="text-xs text-white/70">Pagine viste</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Pagine e schermi – dettaglio</h2>
        <PagesDetailTable pages={pagesDetail} totalViews={overview.screenPageViews} totalUsers={overview.activeUsers} formatDuration={formatDuration} />
      </div>
        </>
      )}

      {/* Scheda Search Console */}
      {activeTab === "gsc" && (
      <div className="space-y-6">
        {searchConsole?.configured === true ? (
          <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-semibold text-white">{searchConsole.overview.clicks.toLocaleString("it-IT")}</p>
              <p className="text-sm text-white/80 mt-0.5">Click (ricerca)</p>
              <p className="text-xs text-white/50 mt-1">Ultimi {days} giorni</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-semibold text-white">{searchConsole.overview.impressions.toLocaleString("it-IT")}</p>
              <p className="text-sm text-white/80 mt-0.5">Impressioni</p>
              <p className="text-xs text-white/50 mt-1">Ultimi {days} giorni</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-semibold text-white">{((searchConsole.overview.ctr ?? 0) * 100).toFixed(2)}%</p>
              <p className="text-sm text-white/80 mt-0.5">CTR</p>
              <p className="text-xs text-white/50 mt-1">Media</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-semibold text-white">{(searchConsole.overview.position ?? 0).toFixed(1)}</p>
              <p className="text-sm text-white/80 mt-0.5">Posizione media</p>
              <p className="text-xs text-white/50 mt-1">Ricerca</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Query di ricerca (GSC) */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h3 className="text-base font-semibold text-white mb-3">Query di ricerca (GSC)</h3>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#1a1a1a]">
                    <tr className="text-white/60 border-b border-white/10">
                      <th className="text-left py-2 font-medium">Query</th>
                      <th className="text-right py-2 font-medium">Click</th>
                      <th className="text-right py-2 font-medium">Impressioni</th>
                      <th className="text-right py-2 font-medium">CTR</th>
                      <th className="text-right py-2 font-medium">Pos.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchConsole.byQuery.slice(0, 20).map((r) => (
                      <tr key={r.query} className="border-b border-white/10 text-white/90">
                        <td className="py-1.5 max-w-[180px] truncate" title={r.query}>{r.query}</td>
                        <td className="text-right py-1.5">{r.clicks}</td>
                        <td className="text-right py-1.5">{r.impressions.toLocaleString("it-IT")}</td>
                        <td className="text-right py-1.5">{((r.ctr ?? 0) * 100).toFixed(2)}%</td>
                        <td className="text-right py-1.5">{r.position.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Serie temporale GSC */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h3 className="text-base font-semibold text-white mb-3">Ricerca nel tempo (GSC)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={searchConsole.byDate.map((d) => ({
                      date: d.date.slice(5),
                      click: d.clicks,
                      impressioni: d.impressions,
                      posizione: d.position,
                    }))}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                    <YAxis yAxisId="L" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <YAxis yAxisId="R" orientation="right" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    />
                    <Legend />
                    <Line yAxisId="L" type="monotone" dataKey="click" stroke="#f5a623" strokeWidth={2} dot={false} name="Click" />
                    <Line yAxisId="L" type="monotone" dataKey="impressioni" stroke="#22c55e" strokeWidth={2} dot={false} name="Impressioni" />
                    <Line yAxisId="R" type="monotone" dataKey="posizione" stroke="#a78bfa" strokeWidth={2} dot={false} name="Pos. media" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Incrocio GA4 / GSC per pagina */}
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h3 className="text-base font-semibold text-white mb-3">Incrocio GA4 / Search Console (per pagina)</h3>
            <p className="text-xs text-white/50 mb-3">Stesso periodo: visualizzazioni e utenti da GA4, click e impressioni da GSC.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/60 border-b border-white/10">
                    <th className="text-left py-2 font-medium">Pagina</th>
                    <th className="text-right py-2 font-medium">GA4 Viz</th>
                    <th className="text-right py-2 font-medium">GA4 Utenti</th>
                    <th className="text-right py-2 font-medium">GSC Click</th>
                    <th className="text-right py-2 font-medium">GSC Impr.</th>
                    <th className="text-right py-2 font-medium">GSC CTR</th>
                    <th className="text-right py-2 font-medium">GSC Pos.</th>
                  </tr>
                </thead>
                <tbody>
                  {searchConsole.pagesCrossReference.slice(0, 25).map((row) => (
                    <tr key={row.fullPageUrl || row.pageTitle} className="border-b border-white/10 text-white/90">
                      <td className="py-1.5 max-w-[220px] truncate" title={row.pageTitle}>{row.pageTitle}</td>
                      <td className="text-right py-1.5">{row.ga4Views.toLocaleString("it-IT")}</td>
                      <td className="text-right py-1.5">{row.ga4Users.toLocaleString("it-IT")}</td>
                      <td className="text-right py-1.5">{row.gscClicks.toLocaleString("it-IT")}</td>
                      <td className="text-right py-1.5">{row.gscImpressions.toLocaleString("it-IT")}</td>
                      <td className="text-right py-1.5">{((row.gscCtr ?? 0) * 100).toFixed(2)}%</td>
                      <td className="text-right py-1.5">{row.gscPosition > 0 ? row.gscPosition.toFixed(1) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
        ) : (
          <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-white/80 text-sm">
            <p className="font-medium text-white/90 mb-2">Dati non disponibili</p>
            <p className="mb-2">Per vedere Search Console qui: imposta <code className="bg-white/10 px-1 rounded">GSC_SITE_URL</code> in <code className="bg-white/10 px-1 rounded">.env.local</code> (es. <code className="bg-white/10 px-1 rounded">https://www.tuosito.it/</code>), abilita &quot;Search Console API&quot; in Google Cloud e aggiungi l’email del service account in Search Console (Impostazioni → Accesso e autorizzazione) con accesso in lettura.</p>
          </div>
        )}
      </div>
      )}

      {/* Scheda AdSense */}
      {activeTab === "adsense" && (
      <div className="space-y-6">
        {adSense?.configured === true ? (
          <>
          {"warning" in adSense && adSense.warning ? (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-amber-100/95 text-sm">
              {adSense.warning}
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-semibold text-white">
                {adSense.overview.estimatedEarnings.toLocaleString("it-IT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {adSense.overview.currencyCode}
              </p>
              <p className="text-sm text-white/80 mt-0.5">Guadagni stimati</p>
              <p className="text-xs text-white/50 mt-1">Ultimi {days} giorni</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-semibold text-white">
                {adSense.overview.pageViews.toLocaleString("it-IT")}
              </p>
              <p className="text-sm text-white/80 mt-0.5">Page views</p>
              <p className="text-xs text-white/50 mt-1">Ultimi {days} giorni</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-semibold text-white">
                {adSense.overview.clicks.toLocaleString("it-IT")}
              </p>
              <p className="text-sm text-white/80 mt-0.5">Click</p>
              <p className="text-xs text-white/50 mt-1">Ultimi {days} giorni</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-semibold text-white">
                {adSense.overview.impressions.toLocaleString("it-IT")}
              </p>
              <p className="text-sm text-white/80 mt-0.5">Impressioni</p>
              <p className="text-xs text-white/50 mt-1">Ultimi {days} giorni</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-semibold text-white">
                {((adSense.overview.ctr ?? 0) * 100).toFixed(2)}%
              </p>
              <p className="text-sm text-white/80 mt-0.5">CTR</p>
              <p className="text-xs text-white/50 mt-1">Media</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-2xl font-semibold text-white">
                {adSense.overview.pageViewsRpm.toFixed(2)}
              </p>
              <p className="text-sm text-white/80 mt-0.5">RPM (page views)</p>
              <p className="text-xs text-white/50 mt-1">{adSense.overview.currencyCode}</p>
            </div>
          </div>
          {adSense.byDate.length > 0 && (
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <h3 className="text-base font-semibold text-white mb-3">Guadagni e click nel tempo</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={adSense.byDate.map((d) => ({
                      date: d.date.length === 8 ? `${d.date.slice(4, 6)}-${d.date.slice(6, 8)}` : d.date.slice(5),
                      guadagni: d.estimatedEarnings,
                      click: d.clicks,
                      impressioni: d.impressions,
                    }))}
                    margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" fontSize={10} />
                    <YAxis yAxisId="L" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <YAxis yAxisId="R" orientation="right" stroke="rgba(255,255,255,0.5)" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                    />
                    <Legend />
                    <Line yAxisId="L" type="monotone" dataKey="guadagni" stroke="#22c55e" strokeWidth={2} dot={false} name="Guadagni (€)" />
                    <Line yAxisId="L" type="monotone" dataKey="click" stroke="#f5a623" strokeWidth={2} dot={false} name="Click" />
                    <Line yAxisId="R" type="monotone" dataKey="impressioni" stroke="#a78bfa" strokeWidth={2} dot={false} name="Impressioni" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          </>
        ) : (
          <div className="rounded-xl bg-white/5 border border-white/10 p-6 text-white/80 text-sm space-y-3">
            <p className="font-medium text-white/90">Dati non disponibili</p>
            {adSense && "error" in adSense && adSense.error ? (
              <p className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-100/95 px-3 py-2 text-sm">
                {adSense.error}
              </p>
            ) : null}
            <p>Per vedere AdSense qui: abilita &quot;AdSense Management API&quot; in Google Cloud (stesso progetto di GA4). In AdSense vai in Impostazioni → Accesso e autorizzazione → Aggiungi utente e inserisci l’email del service account (la stessa di <code className="bg-white/10 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_EMAIL</code>) con accesso &quot;Solo report&quot;. Opzionale: imposta <code className="bg-white/10 px-1 rounded">ADSENSE_ACCOUNT_ID</code> in <code className="bg-white/10 px-1 rounded">.env.local</code> (formato <code className="bg-white/10 px-1 rounded">pub-…</code>).</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
