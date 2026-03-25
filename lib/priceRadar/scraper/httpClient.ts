const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

const ACCEPT_LANGS = [
  "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  "it,it-IT;q=0.9,en;q=0.8",
  "it-IT,it;q=0.95,de;q=0.5,en;q=0.4",
];

export interface FetchHtmlResult {
  ok: boolean;
  status: number;
  body: string;
  /** Tempo totale richiesta (ms), inclusi retry. */
  elapsedMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function pickUserAgent(explicit?: string): string {
  if (explicit?.trim()) return explicit.trim();
  const fromEnv = process.env.PRICE_RADAR_USER_AGENT?.trim();
  if (fromEnv) return fromEnv;
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

function randomHeaders(userAgent: string): Record<string, string> {
  const acceptLang = ACCEPT_LANGS[Math.floor(Math.random() * ACCEPT_LANGS.length)]!;
  const secCh =
    userAgent.includes("Chrome") && !userAgent.includes("Firefox")
      ? '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"'
      : undefined;
  const h: Record<string, string> = {
    "User-Agent": userAgent,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": acceptLang,
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    DNT: "1",
    "Upgrade-Insecure-Requests": "1",
  };
  if (secCh) {
    h["Sec-CH-UA"] = secCh;
    h["Sec-CH-UA-Mobile"] = "?0";
    h["Sec-CH-UA-Platform"] = '"macOS"';
  }
  return h;
}

/** Ritardo casuale con jitter (ms). */
export async function randomScrapeDelay(minMs: number, maxMs: number): Promise<void> {
  const lo = Math.min(minMs, maxMs);
  const hi = Math.max(minMs, maxMs);
  const jitter = 80 + Math.floor(Math.random() * 220);
  const ms = lo + Math.floor(Math.random() * (hi - lo + 1)) + jitter;
  await sleep(ms);
}

async function fetchOnce(
  url: string,
  options: { timeoutMs: number; userAgent: string; signal: AbortSignal }
): Promise<{ ok: boolean; status: number; body: string; ms: number }> {
  const t0 = Date.now();
  const res = await fetch(url, {
    redirect: "follow",
    signal: options.signal,
    headers: randomHeaders(options.userAgent),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body, ms: Date.now() - t0 };
}

/**
 * Fetch HTML con retry lieve (max 2 tentativi) e backoff esponenziale + jitter.
 */
export async function fetchHtml(
  url: string,
  options?: { timeoutMs?: number; userAgent?: string; maxRetries?: number }
): Promise<FetchHtmlResult> {
  const timeoutMs = options?.timeoutMs ?? 28_000;
  const maxRetries = Math.min(2, Math.max(0, options?.maxRetries ?? 2));
  const ua = pickUserAgent(options?.userAgent);

  let totalMs = 0;
  let lastOk = false;
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const rotUa =
        attempt === 0 ? ua : USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
      const r = await fetchOnce(url, {
        timeoutMs,
        userAgent: rotUa,
        signal: controller.signal,
      });
      totalMs += r.ms;
      lastOk = r.ok;
      lastStatus = r.status;
      lastBody = r.body;
      if (r.ok && r.status < 400) {
        return { ok: lastOk, status: lastStatus, body: lastBody, elapsedMs: totalMs };
      }
    } catch {
      totalMs += Math.min(timeoutMs, 5000);
    } finally {
      clearTimeout(timer);
    }
    if (attempt < maxRetries) {
      const backoff = 400 * 2 ** attempt + Math.floor(Math.random() * 400);
      await sleep(backoff);
    }
  }

  return { ok: lastOk, status: lastStatus, body: lastBody, elapsedMs: totalMs };
}
