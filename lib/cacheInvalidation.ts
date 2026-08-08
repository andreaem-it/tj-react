/**
 * Invalidazione on-demand delle cache alla pubblicazione di un articolo.
 *
 * Due livelli indipendenti:
 *  1. Next.js — `revalidateTag` sui tag già dichiarati in `lib/api.ts`
 *     (`tj-posts`, `tj-home`) più `revalidatePath` sulle pagine che elencano
 *     articoli. Senza questo, alzare i `revalidate` significherebbe solo
 *     mostrare contenuti vecchi più a lungo.
 *  2. Cloudflare — purge per URL, perché la CDN serve l'HTML dalla propria
 *     cache e non si accorge che l'origin è cambiato.
 *
 * Nessuna delle due funzioni lancia: un fallimento dell'invalidazione non deve
 * far fallire il webhook (e quindi l'autopost social che gira sullo stesso giro).
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { postCacheTag } from "@/lib/api";
import { SITE_URL } from "@/lib/constants";

/**
 * Tag dichiarati su `unstable_cache` in lib/api.ts. `tj-categories` è incluso
 * perché un articolo può inaugurare una categoria finora vuota, e quel dato sta
 * nel layout (quindi in ogni pagina).
 */
const DATA_CACHE_TAGS = ["tj-posts", "tj-home", "tj-categories"] as const;

/**
 * Cache-life profile richiesto da `revalidateTag` in Next 16. La forma a un
 * solo argomento è deprecata e il runtime stesso indica `"max"`: invalida la
 * voce qualunque sia la sua scadenza, che è ciò che serve alla pubblicazione.
 */
const REVALIDATE_PROFILE = "max";

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";
const PURGE_TIMEOUT_MS = 8_000;

export type ContentTarget = {
  /** Slug dell'articolo, se ricavabile dal payload. */
  slug: string | null;
  /** Slug categoria in forma URL (es. "apps", non "applicazioni"). */
  categoryUrlSlug: string | null;
};

/** Path del sito da invalidare per un dato articolo (sempre almeno la home). */
export function contentPathsFor(target: ContentTarget): string[] {
  const paths = ["/"];
  if (target.categoryUrlSlug) {
    paths.push(`/${target.categoryUrlSlug}`);
    if (target.slug) {
      paths.push(`/${target.categoryUrlSlug}/${target.slug}`);
    }
  }
  return paths;
}

/**
 * Invalida Data Cache e Full Route Cache di Next.
 * Restituisce l'elenco di ciò che è stato invalidato, per il log del webhook.
 */
export function revalidateContent(target: ContentTarget): string[] {
  const done: string[] = [];

  const tags: string[] = [...DATA_CACHE_TAGS];
  if (target.slug) {
    // Invalida anche il singolo articolo, così una ripubblicazione o una
    // correzione non resta appesa al Data Cache.
    tags.push(postCacheTag(target.slug));
  }

  for (const tag of tags) {
    try {
      revalidateTag(tag, REVALIDATE_PROFILE);
      done.push(`tag:${tag}`);
    } catch (e) {
      console.error(`[cache] revalidateTag(${tag}) fallita:`, e);
    }
  }

  for (const path of contentPathsFor(target)) {
    try {
      revalidatePath(path);
      done.push(`path:${path}`);
    } catch (e) {
      console.error(`[cache] revalidatePath(${path}) fallita:`, e);
    }
  }

  return done;
}

export type PurgeOutcome =
  | { status: "skipped"; reason: string }
  | { status: "ok"; purged: number }
  | { status: "error"; reason: string };

/**
 * Purge Cloudflare per URL. Inerte finché `CLOUDFLARE_ZONE_ID` e
 * `CLOUDFLARE_PURGE_TOKEN` non sono configurati: così il deploy di questa
 * funzionalità non dipende dalla creazione del token.
 *
 * Il token richiede il permesso "Zone → Cache Purge → Purge".
 */
export async function purgeCloudflare(paths: string[]): Promise<PurgeOutcome> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const token = process.env.CLOUDFLARE_PURGE_TOKEN?.trim();
  if (!zoneId || !token) {
    return { status: "skipped", reason: "CLOUDFLARE_ZONE_ID/CLOUDFLARE_PURGE_TOKEN non configurati" };
  }
  if (paths.length === 0) {
    return { status: "skipped", reason: "nessun path da purgare" };
  }

  const base = SITE_URL.replace(/\/$/, "");
  const files = paths.map((p) => `${base}${p}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PURGE_TIMEOUT_MS);
  try {
    const res = await fetch(`${CLOUDFLARE_API}/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      // Il corpo può contenere dettagli utili, ma mai il token: si logga solo lo status.
      return { status: "error", reason: `Cloudflare HTTP ${res.status}` };
    }
    return { status: "ok", purged: files.length };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { status: "error", reason: aborted ? "timeout" : "errore di rete" };
  } finally {
    clearTimeout(timeoutId);
  }
}
