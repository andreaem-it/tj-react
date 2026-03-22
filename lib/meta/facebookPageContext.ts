/**
 * Risolve Page ID + Page Access Token + Instagram Business Account ID
 * per pubblicazione (stessa logica di selezione pagina di social-stats).
 */

import { META_GRAPH_BASE } from "./graphConstants";

export type PagePublishingContext = {
  pageId: string;
  pageAccessToken: string;
  instagramUserId: string | null;
};

function buildUrl(path: string, params: Record<string, string>, token: string): string {
  const p = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(p, META_GRAPH_BASE);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

async function graphGetText(path: string, params: Record<string, string>, token: string): Promise<string> {
  const res = await fetch(buildUrl(path, params, token), { cache: "no-store" });
  return res.text();
}

async function tryGetPageFromBusiness(
  token: string,
  pageIdEnv: string | undefined,
  pageNameEnv: string | undefined
): Promise<{ id: string; access_token: string } | null> {
  let businessId = process.env.FACEBOOK_BUSINESS_ID?.trim();
  if (!businessId) {
    const businessesText = await graphGetText("me/businesses", { fields: "id,name" }, token);
    try {
      const biz = JSON.parse(businessesText) as { data?: Array<{ id: string }>; error?: unknown };
      if (biz.error || !biz.data?.length) return null;
      businessId = biz.data[0].id;
    } catch {
      return null;
    }
  }
  const ownedText = await graphGetText(`${businessId}/owned_pages`, { fields: "id,name,access_token" }, token);
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
    return {
      id: chosen.id,
      access_token: chosen.access_token ?? token,
    };
  } catch {
    return null;
  }
}

/**
 * Token utente in FACEBOOK_ACCESS_TOKEN; deve poter elencare le pagine e avere Page Token con permessi di publish.
 */
export async function resolvePagePublishingContext(
  userToken: string
): Promise<{ ok: true; ctx: PagePublishingContext } | { ok: false; message: string }> {
  let pageToken = userToken.trim();
  let pageId: string | null = null;

  const accountsText = await graphGetText("me/accounts", { fields: "id,name,access_token" }, userToken);
  type AccountsPayload = {
    data?: Array<{ id: string; name: string; access_token: string }>;
    error?: { message?: string };
  };
  let accountsData: AccountsPayload | null = null;
  try {
    accountsData = JSON.parse(accountsText) as AccountsPayload;
  } catch {
    accountsData = null;
  }

  if (accountsData && "error" in accountsData && accountsData.error) {
    const msg = accountsData.error.message ?? accountsText.slice(0, 200);
    return {
      ok: false,
      message: /pages_show_list/i.test(msg)
        ? "Aggiungi pages_show_list al token e rigenera."
        : msg,
    };
  }

  const pageIdEnv = process.env.FACEBOOK_PAGE_ID?.trim();
  const pageNameEnv = process.env.FACEBOOK_PAGE_NAME?.trim();

  if (accountsData?.data?.length) {
    const pages = accountsData.data;
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
      const fromBusiness = await tryGetPageFromBusiness(userToken, pageIdEnv, pageNameEnv);
      if (fromBusiness) {
        pageId = fromBusiness.id;
        pageToken = fromBusiness.access_token;
      } else {
        return {
          ok: false,
          message: `Pagina non trovata tra le pagine dell'account. Disponibili: ${pages.map((p) => `${p.name} (${p.id})`).join(", ")}.`,
        };
      }
    } else {
      pageId = pages[0].id;
      pageToken = pages[0].access_token;
    }
  } else if (pageIdEnv || pageNameEnv) {
    const fromBusiness = await tryGetPageFromBusiness(userToken, pageIdEnv, pageNameEnv);
    if (fromBusiness) {
      pageId = fromBusiness.id;
      pageToken = fromBusiness.access_token;
    }
  }

  if (!pageId) {
    return {
      ok: false,
      message:
        "Nessuna pagina Facebook associata al token. Usa un token admin della pagina e me/accounts, oppure FACEBOOK_PAGE_ID / business_management.",
    };
  }

  const pageDetailText = await graphGetText(
    pageId,
    { fields: "instagram_business_account{id}" },
    pageToken
  );
  let instagramUserId: string | null = null;
  try {
    const pageDetail = JSON.parse(pageDetailText) as {
      instagram_business_account?: { id?: string };
      error?: { message?: string };
    };
    if (!pageDetail.error && pageDetail.instagram_business_account?.id) {
      instagramUserId = pageDetail.instagram_business_account.id;
    }
  } catch {
    /* ignore */
  }

  return {
    ok: true,
    ctx: {
      pageId,
      pageAccessToken: pageToken,
      instagramUserId,
    },
  };
}
