import { fetchPosts } from "@/lib/api";
import { HOME_RANKING_OVERRIDES } from "@/lib/home/overrides";
import { prepareItems, rankHomeItems } from "@/lib/home/ranking";
import { composeDigest, type Digest } from "@/lib/newsletter/digest";

/**
 * Caricamento e composizione del digest.
 *
 * **Modulo server-only.**
 *
 * Costa **una** richiesta, condivisa via Data Cache: si prende una pagina di
 * articoli recenti e si filtra per finestra temporale, invece di interrogare
 * l'API per intervallo. Con la cadenza di pubblicazione reale — una decina di
 * pezzi al giorno — quaranta articoli coprono largamente le ventiquattro ore, e
 * `PROBE_SIZE` è il margine perché una giornata intensa non tronchi la rassegna.
 */

/** Articoli richiesti a monte, prima del filtro sulla finestra. */
const PROBE_SIZE = 40;

/** Ampiezza predefinita della finestra: un digest quotidiano. */
export const DEFAULT_WINDOW_HOURS = 24;

export interface LoadDigestOptions {
  /** Ampiezza della finestra in ore. */
  windowHours?: number;
  /** Istante finale; predefinito adesso. Parametro per rendere ripetibile l'anteprima. */
  now?: number;
  maxItems?: number;
}

export interface LoadDigestResult {
  digest: Digest | null;
  /** Articoli esaminati nella finestra, anche quelli scartati. */
  examined: number;
  /** La sorgente articoli non ha risposto: da distinguere da "nessuna notizia". */
  upstreamFailed: boolean;
}

export async function loadDigest(options: LoadDigestOptions = {}): Promise<LoadDigestResult> {
  const windowHours = options.windowHours ?? DEFAULT_WINDOW_HOURS;
  const now = options.now ?? Date.now();

  const { posts, error } = await fetchPosts({ perPage: PROBE_SIZE, page: 1 });
  if (error || posts.length === 0) {
    // Distinzione esplicita: un errore upstream non è una giornata senza
    // notizie, e chi decide se spedire deve poterli distinguere.
    return { digest: null, examined: 0, upstreamFailed: Boolean(error) };
  }

  const periodEnd = new Date(now);
  const periodStart = new Date(now - windowHours * 3_600_000);

  const ranked = rankHomeItems(prepareItems(posts), {
    now,
    overrides: HOME_RANKING_OVERRIDES,
  });

  const examined = posts.filter((post) => {
    const published = new Date(post.date).getTime();
    return Number.isFinite(published) && published >= periodStart.getTime() && published <= now;
  }).length;

  return {
    digest: composeDigest(ranked, { periodStart, periodEnd, maxItems: options.maxItems }),
    examined,
    upstreamFailed: false,
  };
}
