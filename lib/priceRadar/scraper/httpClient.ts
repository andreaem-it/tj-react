const DEFAULT_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export interface FetchHtmlResult {
  ok: boolean;
  status: number;
  body: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Ritardo casuale prudente tra una richiesta e l’altra (ms). */
export async function randomScrapeDelay(minMs: number, maxMs: number): Promise<void> {
  const lo = Math.min(minMs, maxMs);
  const hi = Math.max(minMs, maxMs);
  const ms = lo + Math.floor(Math.random() * (hi - lo + 1));
  await sleep(ms);
}

export async function fetchHtml(
  url: string,
  options?: { timeoutMs?: number; userAgent?: string }
): Promise<FetchHtmlResult> {
  const timeoutMs = options?.timeoutMs ?? 28_000;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": options?.userAgent ?? process.env.PRICE_RADAR_USER_AGENT?.trim() || DEFAULT_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
      },
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(t);
  }
}
