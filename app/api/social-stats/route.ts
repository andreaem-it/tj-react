import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

const CACHE_SECONDS = 3600; // 1 ora: evita di colpire la Graph API a ogni richiesta

export interface SocialStatsResponse {
  facebook: { followers: number } | null;
  instagram: { followers: number } | null;
  /** Solo in caso di errore, per capire cosa controllare. */
  hint?: "token_missing" | "graph_api_error";
  /** Status HTTP della Graph API quando hint === "graph_api_error". */
  graph_status?: number;
  /** Messaggio di errore restituito dalla Graph API (utile per debug). */
  graph_message?: string;
  /** Suggerimento quando Facebook ok ma Instagram manca. */
  instagram_hint?: string;
}

const GRAPH_BASE = "https://graph.facebook.com/v18.0/";

function graphFetch(path: string, params: Record<string, string>, token: string): Promise<string> {
  const url = new URL(path.startsWith("/") ? path.slice(1) : path, GRAPH_BASE);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return fetch(url.toString(), { next: { revalidate: CACHE_SECONDS } }).then((r) => r.text());
}

/** Prova a ottenere la pagina dal Business Manager (portfolio) se non è in me/accounts. */
async function tryGetPageFromBusiness(
  token: string,
  pageIdEnv: string | undefined,
  pageNameEnv: string | undefined
): Promise<{ id: string; access_token: string } | null> {
  let businessId = process.env.FACEBOOK_BUSINESS_ID?.trim();
  if (!businessId) {
    const businessesText = await graphFetch("me/businesses", { fields: "id,name" }, token);
    try {
      const biz = JSON.parse(businessesText) as { data?: Array<{ id: string; name: string }>; error?: unknown };
      if (biz.error || !biz.data?.length) return null;
      businessId = biz.data[0].id;
    } catch {
      return null;
    }
  }
  const ownedText = await graphFetch(`${businessId}/owned_pages`, {
    fields: "id,name,access_token",
  }, token);
  try {
    const owned = JSON.parse(ownedText) as {
      data?: Array<{ id: string; name: string; access_token?: string }>;
      error?: { message?: string };
    };
    if (owned.error || !owned.data?.length) return null;
    const pages = owned.data;
    const chosen =
      pageIdEnv ? pages.find((p) => p.id === pageIdEnv)
      : pageNameEnv
        ? pages.find(
            (p) =>
              p.name.trim().toLowerCase() === pageNameEnv.trim().toLowerCase() ||
              p.name.trim().toLowerCase().includes(pageNameEnv.trim().toLowerCase())
          ) || pages.find((p) => pageNameEnv.trim().toLowerCase().includes(p.name.trim().toLowerCase()))
        : pages[0];
    if (!chosen) return null;
    if (chosen.access_token) {
      return { id: chosen.id, access_token: chosen.access_token };
    }
    return { id: chosen.id, access_token: token };
  } catch {
    return null;
  }
}

async function fetchSocialStatsFromGraph(): Promise<SocialStatsResponse> {
  const token = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!token?.trim()) {
    return {
      facebook: null,
      instagram: null,
      hint: "token_missing",
    };
  }
  try {
    let pageToken = token;
    let pageId: string | null = null;

    const accountsText = await graphFetch("me/accounts", { fields: "id,name,access_token" }, token);
    const accountsData = (() => {
      try {
        return JSON.parse(accountsText) as {
          data?: Array<{ id: string; name: string; access_token: string }>;
          error?: { message?: string };
        };
      } catch {
        return null;
      }
    })();

    if (accountsData?.error) {
      const msg = accountsData.error.message ?? accountsText.slice(0, 200);
      const needsPermission = /pages_show_list/i.test(msg);
      return {
        facebook: null,
        instagram: null,
        hint: "graph_api_error",
        graph_status: 403,
        graph_message: needsPermission
          ? "Aggiungi il permesso 'pages_show_list' in Graph API Explorer, poi rigenera il token e riautorizza l'app. Usa quel nuovo token in FACEBOOK_ACCESS_TOKEN."
          : msg,
      };
    }

    if (accountsData?.data?.length) {
      const pages = accountsData.data;
      const pageIdEnv = process.env.FACEBOOK_PAGE_ID?.trim();
      const pageNameEnv = process.env.FACEBOOK_PAGE_NAME?.trim();
      const chosen =
        pageIdEnv ? pages.find((p) => p.id === pageIdEnv)
        : pageNameEnv
          ? pages.find(
              (p) =>
                p.name.trim().toLowerCase() === pageNameEnv.trim().toLowerCase() ||
                p.name.trim().toLowerCase().includes(pageNameEnv.trim().toLowerCase())
            ) || pages.find((p) => pageNameEnv.trim().toLowerCase().includes(p.name.trim().toLowerCase()))
          : pages[0];
      if (chosen) {
        pageId = chosen.id;
        pageToken = chosen.access_token;
      } else if (pageIdEnv || pageNameEnv) {
        const fromBusiness = await tryGetPageFromBusiness(token, pageIdEnv, pageNameEnv);
        if (fromBusiness) {
          pageId = fromBusiness.id;
          pageToken = fromBusiness.access_token;
        } else {
          const requested = pageIdEnv || pageNameEnv;
          return {
            facebook: null,
            instagram: null,
            hint: "graph_api_error",
            graph_status: 404,
            graph_message: `La pagina "${requested}" non è nella lista delle pagine di questo account. Se la pagina è in un portfolio business, aggiungi il permesso business_management e FACEBOOK_BUSINESS_ID (es. 634990590540527) in .env.local. Pagine disponibili da me/accounts: ${pages.map((p) => `${p.name} (${p.id})`).join(", ")}.`,
          };
        }
      } else {
        pageId = pages[0].id;
        pageToken = pages[0].access_token;
      }
    } else {
      const pageIdEnv = process.env.FACEBOOK_PAGE_ID?.trim();
      const pageNameEnv = process.env.FACEBOOK_PAGE_NAME?.trim();
      if (pageIdEnv || pageNameEnv) {
        const fromBusiness = await tryGetPageFromBusiness(token, pageIdEnv, pageNameEnv);
        if (fromBusiness) {
          pageId = fromBusiness.id;
          pageToken = fromBusiness.access_token;
        }
      }
    }

    const fields = "fan_count,instagram_business_account{followers_count}";
    const target = pageId ? pageId : "me";
    const bodyText = await graphFetch(target, { fields }, pageToken);
    const data = (() => {
      try {
        return JSON.parse(bodyText) as {
          fan_count?: number;
          instagram_business_account?: { followers_count?: number };
          error?: { message?: string; code?: number };
        };
      } catch {
        return null;
      }
    })();

    if (!data) {
      let graphMessage: string | undefined;
      try {
        const errBody = JSON.parse(bodyText) as { error?: { message?: string } };
        graphMessage = errBody.error?.message;
      } catch {
        graphMessage = bodyText.slice(0, 200);
      }
      console.error("[api/social-stats] Graph API error:", graphMessage || bodyText);
      return {
        facebook: null,
        instagram: null,
        hint: "graph_api_error",
        graph_status: 400,
        graph_message: graphMessage,
      };
    }

    if (data.error) {
      console.error("[api/social-stats] Graph API body error:", data.error);
      const msg = data.error.message ?? "";
      const noPagesHint =
        /fan_count|nonexisting field/i.test(msg) &&
        Array.isArray(accountsData?.data) &&
        accountsData.data.length === 0;
      const needsPagesReadEngagement =
        /pages_read_engagement|Page Public Content|Page Public Metadata/i.test(msg);
      let graphMessage: string;
      if (noPagesHint) {
        graphMessage =
          "L'account Facebook usato per il token non è amministratore di nessuna pagina, oppure il token è scaduto. Genera un nuovo token con l'account admin della pagina e autorizza l'accesso alle pagine.";
      } else if (needsPagesReadEngagement) {
        graphMessage =
          "Manca il permesso 'pages_read_engagement'. In Graph API Explorer aggiungi l'autorizzazione pages_read_engagement, poi clicca 'Genera token di accesso', riautorizza l'app e usa il nuovo token (o il nuovo access_token della pagina da me/accounts).";
      } else {
        graphMessage = msg;
      }
      return {
        facebook: null,
        instagram: null,
        hint: "graph_api_error",
        graph_status: 400,
        graph_message: graphMessage,
      };
    }

    const facebook =
      typeof data.fan_count === "number" ? { followers: data.fan_count } : null;
    const ig = data.instagram_business_account;
    const instagram =
      ig != null && typeof ig.followers_count === "number"
        ? { followers: ig.followers_count }
        : null;

    const instagramHint =
      facebook != null && instagram == null
        ? "Per i follower Instagram: aggiungi il permesso 'instagram_basic' in Graph API Explorer, rigenera il token e riautorizza. L'account Instagram deve essere Business/Creator e collegato alla pagina Facebook in Meta Business Suite."
        : undefined;

    return { facebook, instagram, instagram_hint: instagramHint };
  } catch (err) {
    console.error("[api/social-stats]", err);
    return {
      facebook: null,
      instagram: null,
      hint: "graph_api_error",
    };
  }
}

/** GET /api/social-stats → follower Facebook e Instagram (richiede FACEBOOK_ACCESS_TOKEN in .env). ?refresh=1 bypassa la cache. */
export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.get("refresh") === "1";
  const pageKey = [
    process.env.FACEBOOK_PAGE_ID ?? "",
    process.env.FACEBOOK_PAGE_NAME ?? "",
    process.env.FACEBOOK_BUSINESS_ID ?? "",
  ].join("|");
  const data = refresh
    ? await fetchSocialStatsFromGraph()
    : await unstable_cache(
        fetchSocialStatsFromGraph,
        ["social-stats", pageKey],
        { revalidate: CACHE_SECONDS, tags: ["social-stats"] }
      )();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": refresh
        ? "no-store, no-cache, must-revalidate"
        : `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=60`,
    },
  });
}
