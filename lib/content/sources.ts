import { decodeHtmlEntities } from "@/lib/content/text";
import { SITE_URL } from "@/lib/constants";
import type { ArticleSource } from "@/lib/content/types";

/**
 * Estrazione delle fonti citate nel corpo di un articolo (§16-17).
 *
 * Modulo puro. Non dichiara nessuna fonte che l'articolo non citi già: si
 * limita a leggere i link `<a href>` verso un dominio esterno che già
 * compaiono nell'HTML sanificato. Un articolo senza link esterni non produce
 * alcuna fonte — non è un caso da correggere, è l'informazione corretta.
 *
 * Esclusi i link verso il dominio del sito (già navigazione interna, non una
 * fonte) e verso destinazioni commerciali come Amazon: quei link sono
 * prodotti, gestiti come tali da `lib/priceRadar`, non citazioni editoriali.
 */

const ANCHOR_HREF_RE = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/gi;

/** Domini commerciali o di tracciamento: non sono fonti editoriali. */
const EXCLUDED_HOST_SUFFIXES = [
  "amazon.it",
  "amazon.com",
  "amazon.de",
  "amazon.fr",
  "amazon.es",
  "amazon.co.uk",
  "amzn.to",
  "geni.us",
  "bit.ly",
];

/**
 * Editori riconosciuti, per un'etichetta leggibile invece del solo dominio.
 *
 * Include gli stessi editori usati come segnale di affidabilità in
 * `classify.ts` (`REPORT_MARKERS`), più le fonti tecnologiche più citate nel
 * corpus. Un dominio assente dalla tabella non sparisce: compare comunque,
 * con il proprio hostname come nome.
 */
const KNOWN_PUBLISHERS: Record<string, string> = {
  "bloomberg.com": "Bloomberg",
  "reuters.com": "Reuters",
  "theinformation.com": "The Information",
  "wsj.com": "The Wall Street Journal",
  "nikkei.com": "Nikkei",
  "digitimes.com": "DigiTimes",
  "theelec.kr": "The Elec",
  "9to5mac.com": "9to5Mac",
  "9to5google.com": "9to5Google",
  "macrumors.com": "MacRumors",
  "theverge.com": "The Verge",
  "engadget.com": "Engadget",
  "arstechnica.com": "Ars Technica",
  "techcrunch.com": "TechCrunch",
  "gsmarena.com": "GSMArena",
  "apple.com": "Apple",
  "developer.apple.com": "Apple Developer",
  "support.apple.com": "Apple Support",
  "android.com": "Android",
  "blog.google": "Google",
};

/** Oltre questo numero il blocco "Fonti" pesa più di quanto informi. */
const MAX_SOURCES = 6;

function ownHost(): string {
  try {
    return new URL(SITE_URL).hostname.replace(/^www\./, "");
  } catch {
    return "techjournal.it";
  }
}

function isExcludedHost(host: string): boolean {
  return EXCLUDED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

function publisherName(host: string): string {
  return KNOWN_PUBLISHERS[host] ?? host;
}

/**
 * Estrae le fonti esterne citate, deduplicate per host + percorso, nell'ordine
 * in cui compaiono nel testo.
 *
 * L'ordine non è casuale: in un articolo la prima citazione tende a essere la
 * fonte primaria della notizia, quelle successive corredo.
 */
export function extractSources(html: string): ArticleSource[] {
  if (!html) return [];

  const own = ownHost();
  const seen = new Set<string>();
  const sources: ArticleSource[] = [];

  for (const match of html.matchAll(ANCHOR_HREF_RE)) {
    if (sources.length >= MAX_SOURCES) break;

    const raw = decodeHtmlEntities((match[1] ?? match[2] ?? "").trim());
    if (!raw) continue;

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      // Link relativo o ancora interna (`#sezione`): non è una fonte esterna.
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;

    const host = url.hostname.replace(/^www\./, "");
    if (host === own || isExcludedHost(host)) continue;

    const key = `${host}${url.pathname}`;
    if (seen.has(key)) continue;
    seen.add(key);

    sources.push({ name: publisherName(host), url: raw });
  }

  return sources;
}
