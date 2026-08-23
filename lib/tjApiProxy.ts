import { NextRequest, NextResponse } from "next/server";
import { getTjApiBaseUrl } from "@/lib/config/tjApi";

export type ProxyToTjApiOptions = {
  /** Es. PATCH in ingresso → PUT verso tj-api (articoli). */
  methodOverride?: string;
  /** Timeout fetch verso tj-api (ms). Default 10s; webhook lunghi es. 120000. */
  timeoutMs?: number;
  /**
   * Sostituisce il corpo della richiesta in ingresso con JSON calcolato dal
   * chiamante (es. il webhook di pubblicazione, che arricchisce il payload WP
   * con topic e classificazione prima di inoltrarlo). Se assente si inoltra il
   * corpo originale byte per byte, comportamento di sempre.
   */
  bodyOverride?: unknown;
};

const DEFAULT_UPSTREAM_TIMEOUT_MS = 10_000;
/** Identifica le chiamate server-to-server verso tj-api (vedi nota su AI Labyrinth). */
const TJ_API_USER_AGENT = "TechJournal-Frontend/1.0 (+https://www.techjournal.it)";
const IS_DEV = process.env.NODE_ENV !== "production";
const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;
const MAX_RESPONSE_BODY_BYTES = 10 * 1024 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Header di risposta upstream da ripassare al client (case-insensitive in fetch).
 */
const UPSTREAM_RESPONSE_HEADERS_TO_FORWARD = [
  "content-type",
  "cache-control",
  "pragma",
  "x-next-page",
  "x-next-already",
  "retry-after",
] as const;

function buildUpstreamResponseHeaders(res: Response): Headers {
  const outHeaders = new Headers();
  for (const name of UPSTREAM_RESPONSE_HEADERS_TO_FORWARD) {
    const v = res.headers.get(name);
    if (v) {
      outHeaders.set(name, v);
    }
  }
  const setCookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : null;
  if (setCookies?.length) {
    for (const c of setCookies) {
      outHeaders.append("Set-Cookie", c);
    }
  } else {
    const single = res.headers.get("set-cookie");
    if (single) {
      outHeaders.append("Set-Cookie", single);
    }
  }
  return outHeaders;
}

function isLikelyHtmlBody(body: string, contentType: string | null): boolean {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("text/html")) return true;
  const t = body.trimStart().slice(0, 512).toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.startsWith("<head");
}

/**
 * Inoltra la richiesta a tj-api con stesso path e query string.
 * Cookie solo verso upstream (non loggati). Timeout 10s. Loop se stesso origin del request.
 */
export async function proxyToTjApi(
  request: NextRequest,
  options?: ProxyToTjApiOptions,
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const base = getTjApiBaseUrl();
  if (!base) {
    if (IS_DEV) console.log("[WP Proxy]", request.method, pathname, 503);
    return NextResponse.json(
      { error: "TJ_API_BASE_URL non configurato" },
      { status: 503, headers: NO_STORE },
    );
  }

  let upstreamOrigin: string;
  try {
    upstreamOrigin = new URL(base).origin;
  } catch {
    if (IS_DEV) console.log("[WP Proxy]", request.method, pathname, 500);
    return NextResponse.json(
      { error: "TJ_API_BASE_URL non valido" },
      { status: 500, headers: NO_STORE },
    );
  }

  if (upstreamOrigin === request.nextUrl.origin) {
    if (IS_DEV) console.log("[WP Proxy]", request.method, pathname, 500);
    return NextResponse.json(
      { error: "Proxy loop detected" },
      { status: 500, headers: NO_STORE },
    );
  }

  const path = request.nextUrl.pathname + request.nextUrl.search;
  const url = `${base}${path}`;

  const method = options?.methodOverride ?? request.method;

  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("Cookie", cookie);
  }
  if (pathname.startsWith("/api/")) {
    headers.set("Accept", "application/json");
  } else {
    const accept = request.headers.get("accept");
    if (accept) {
      headers.set("Accept", accept);
    }
  }
  const webhookSecret = request.headers.get("x-tj-webhook-secret");
  if (webhookSecret) {
    headers.set("X-TJ-Webhook-Secret", webhookSecret);
  }

  if (options?.bodyOverride !== undefined) {
    headers.set("Content-Type", "application/json");
  } else {
    const contentTypeIn = request.headers.get("content-type");
    if (contentTypeIn) {
      headers.set("Content-Type", contentTypeIn);
    }
  }

  // Senza User-Agent esplicito, fetch invia "node": Cloudflare lo classifica come
  // bot e può servire AI Labyrinth al posto della risposta JSON, con conseguente
  // 502 intermittente (rilevato in produzione su backend.techjournal.it).
  headers.set("User-Agent", TJ_API_USER_AGENT);
  // Header condiviso per la regola Skip su Cloudflare, stesso schema di
  // WP_TJ_BYPASS_TOKEN verso api.techjournal.it. Va trattato come un segreto:
  // chi lo conosce scavalca i controlli bot sull'host backend.
  const bypassToken = process.env.TJ_API_BYPASS_TOKEN?.trim();
  if (bypassToken) {
    headers.set("X-TJ-API-Token", bypassToken);
  }

  const requestedTimeout = options?.timeoutMs ?? DEFAULT_UPSTREAM_TIMEOUT_MS;
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.min(120_000, Math.max(100, requestedTimeout))
    : DEFAULT_UPSTREAM_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let body: BodyInit | undefined;
    if (options?.bodyOverride !== undefined) {
      const serialized = JSON.stringify(options.bodyOverride);
      if (typeof serialized !== "string") {
        return NextResponse.json(
          { error: "Invalid JSON payload" },
          { status: 400, headers: NO_STORE },
        );
      }
      if (Buffer.byteLength(serialized, "utf8") > MAX_REQUEST_BODY_BYTES) {
        return NextResponse.json(
          { error: "Payload too large" },
          { status: 413, headers: NO_STORE },
        );
      }
      body = serialized;
    } else if (method !== "GET" && method !== "HEAD") {
      const reqLenHeader = request.headers.get("content-length");
      const reqLen =
        typeof reqLenHeader === "string" && reqLenHeader.trim() !== ""
          ? Number(reqLenHeader)
          : Number.NaN;
      if (
        reqLenHeader !== null &&
        (!Number.isSafeInteger(reqLen) || reqLen < 0)
      ) {
        return NextResponse.json(
          { error: "Invalid Content-Length" },
          { status: 400, headers: NO_STORE },
        );
      }
      if (Number.isFinite(reqLen) && reqLen > MAX_REQUEST_BODY_BYTES) {
        return NextResponse.json(
          { error: "Payload too large" },
          { status: 413, headers: NO_STORE },
        );
      }
      const buf = await request.arrayBuffer();
      if (buf.byteLength > MAX_REQUEST_BODY_BYTES) {
        return NextResponse.json(
          { error: "Payload too large" },
          { status: 413, headers: NO_STORE },
        );
      }
      if (buf.byteLength > 0) {
        body = buf;
      }
    }

    const res = await fetch(url, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
    });

    if (IS_DEV) console.log("[WP Proxy]", method, pathname, res.status);

    const upstreamLenHeader = res.headers.get("content-length");
    const upstreamLen =
      typeof upstreamLenHeader === "string" && upstreamLenHeader.trim() !== ""
        ? Number(upstreamLenHeader)
        : Number.NaN;
    if (Number.isFinite(upstreamLen) && upstreamLen > MAX_RESPONSE_BODY_BYTES) {
      return NextResponse.json(
        { error: "Upstream payload too large" },
        { status: 502, headers: NO_STORE },
      );
    }

    const text = await res.text();
    if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BODY_BYTES) {
      return NextResponse.json(
        { error: "Upstream payload too large" },
        { status: 502, headers: NO_STORE },
      );
    }
    const upstreamCt = res.headers.get("content-type");

    if (pathname.startsWith("/api/")) {
      const trimmed = text.trimStart();
      const looksJson =
        (upstreamCt ?? "").toLowerCase().includes("application/json") ||
        trimmed.startsWith("{") ||
        trimmed.startsWith("[");
      if (!res.ok || !looksJson) {
        let message = "Servizio backend non disponibile";
        if (looksJson) {
          try {
            const parsed = JSON.parse(text) as { error?: unknown };
            if (typeof parsed.error === "string" && parsed.error.trim()) {
              message = parsed.error;
            }
          } catch {
            /* ignore */
          }
        }
        // Maschera 401/403 upstream: non esporre il modello auth del backend al client.
        const MASK_AS_502 = new Set([401, 403, 407]);
        const status =
          res.status >= 500 || MASK_AS_502.has(res.status) ? 502 : res.status || 502;
        const out = NextResponse.json(
          {
            error: message,
            ...(IS_DEV ? { upstreamStatus: res.status, upstreamUrl: url } : {}),
          },
          { status },
        );
        const ra = res.headers.get("retry-after");
        if (ra) out.headers.set("Retry-After", ra);
        return out;
      }
    }

    if (isLikelyHtmlBody(text, upstreamCt)) {
      const status = res.status >= 400 ? res.status : 502;
      const out = NextResponse.json(
        {
          error:
            "L'upstream ha risposto con HTML invece di JSON: la richiesta non sta arrivando a tj-api come previsto.",
          ...(IS_DEV ? { upstreamUrl: url } : {}),
          hint:
            "TJ_API_BASE_URL deve essere l’URL del backend tj-api (locale es. http://127.0.0.1:3002, produzione l’host api), non il sito front-end.",
        },
        { status },
      );
      const ra = res.headers.get("retry-after");
      if (ra) {
        out.headers.set("Retry-After", ra);
      }
      return out;
    }

    const outHeaders = buildUpstreamResponseHeaders(res);

    return new NextResponse(text, {
      status: res.status,
      headers: outHeaders,
    });
  } catch (err) {
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || err.message === "This operation was aborted");
    const status = isAbort ? 504 : 502;
    if (IS_DEV) {
      console.log("[WP Proxy]", method, pathname, status, err instanceof Error ? err.message : err);
    }
    return NextResponse.json(
      { error: isAbort ? "Upstream timeout" : "Upstream error" },
      { status, headers: NO_STORE },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
