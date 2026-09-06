import { getTjApiBaseUrl } from "@/lib/config/tjApi";
import { tjApiServerHeaders } from "@/lib/tjApiServerHeaders";
import { fetchTjProxyJson, type TjCachePolicy } from "@/lib/tjApiClient";
import type {
  CompatibilityStatus,
  Device,
  DeviceDetailPayload,
  DeviceType,
  OperatingSystem,
  OsDetailPayload,
} from "@/lib/compatibility/types";

const CTX = "compatibility";

const DIRECT_TIMEOUT_MS = 8000;

/**
 * Richiesta diretta a tj-api, quando `TJ_API_BASE_URL` è configurata.
 *
 * ## Il bug che questa funzione risolve
 *
 * `fetchTjProxyJson` passa da `resolvePublicApiUrl`, che restituisce un path
 * **relativo** (`/api/compatibility/devices`) quando
 * `NEXT_PUBLIC_TJ_API_BASE_URL` non è valorizzata — ed è la configurazione
 * consigliata in `.env.example`, che suggerisce di lasciarla vuota e usare il
 * proxy Next. Su Node `fetch("/api/...")` non ha un'origine da cui partire e
 * lancia; il fallback riprova lo stesso path relativo e lancia di nuovo.
 *
 * L'effetto osservato: `/compatibility` renderizzava **zero dispositivi** con il
 * messaggio di elenco vuoto, e nei log comparivano
 * `[tjApiClient] API error (compatibility/devices): network/timeout` a ogni
 * render — anche durante il build. La pagina non era in errore, mostrava
 * "nessun dato" come se il database fosse vuoto.
 *
 * La trappola era già documentata in `lib/priceRadar/server.ts`, che per questo
 * va diretto a tj-api. Qui si fa lo stesso, tenendo il proxy come ripiego per
 * non cambiare comportamento dove oggi funziona (chiamate dal browser, o deploy
 * con `NEXT_PUBLIC_TJ_API_BASE_URL` valorizzata).
 */
async function fetchDirectJson<T>(
  path: string,
  cachePolicy: TjCachePolicy | undefined,
): Promise<T | null> {
  const base = getTjApiBaseUrl();
  if (!base) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIRECT_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      headers: tjApiServerHeaders(),
      signal: controller.signal,
      ...(cachePolicy === undefined || cachePolicy === "no-store"
        ? { cache: "no-store" as RequestCache }
        : { next: { revalidate: cachePolicy.revalidate } }),
    });
    if (!res.ok) {
      console.error(`[${CTX}] upstream ${res.status} su ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`[${CTX}] fetch diretto fallito su ${path}:`, e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Diretto se possibile, altrimenti proxy: nessun percorso viene rimosso. */
async function fetchCompatibilityJson<T>(
  path: string,
  context: string,
  cachePolicy?: TjCachePolicy,
): Promise<T | null> {
  const direct = await fetchDirectJson<T>(path, cachePolicy);
  if (direct !== null) return direct;
  return fetchTjProxyJson<T>(path, context, undefined, cachePolicy);
}

/**
 * Cache degli elenchi completi per le pagine in ISR.
 *
 * Serve agli hub `/topic/*`, che consultano gli elenchi solo per sapere *se*
 * esiste una scheda da collegare. Il default `no-store` di `fetchTjProxyJson`
 * renderebbe dinamica l'intera route annullandone il `revalidate`, e un catalogo
 * che cambia quando esce un dispositivo nuovo non giustifica un render per
 * visita.
 */
export const COMPATIBILITY_LIST_REVALIDATE_S = 3600;

/**
 * Dati pubblici compatibilità: stesso stack di `fetchPosts` / Price Radar
 * (`fetchWithFallback` + proxy `/api/compatibility/*`).
 *
 * `cachePolicy` è opzionale e mantiene il default storico, così `/compatibility`
 * — `force-dynamic` per via dei filtri in query string — non cambia
 * comportamento.
 */
export async function fetchCompatibilityDevices(
  type?: DeviceType,
  cachePolicy?: TjCachePolicy,
): Promise<Device[]> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  const data = await fetchCompatibilityJson<{ devices: Device[] }>(
    `/api/compatibility/devices${qs}`,
    `${CTX}/devices`,
    cachePolicy,
  );
  return data?.devices ?? [];
}

export async function fetchCompatibilityOsList(
  cachePolicy?: TjCachePolicy,
): Promise<OperatingSystem[]> {
  const data = await fetchCompatibilityJson<{ operatingSystems: OperatingSystem[] }>(
    `/api/compatibility/os`,
    `${CTX}/os`,
    cachePolicy,
  );
  return data?.operatingSystems ?? [];
}

/** Cache dati device: allineata al `revalidate` della pagina `/compatibility/device/[slug]`. */
const DEVICE_DETAIL_REVALIDATE_S = 3600;

export async function fetchDeviceDetail(slug: string): Promise<DeviceDetailPayload | null> {
  const enc = encodeURIComponent(slug);
  // Senza politica di cache esplicita il fetch sarebbe `no-store`, che renderebbe
  // dinamica l'intera pagina annullandone il `revalidate`.
  return fetchCompatibilityJson<DeviceDetailPayload>(
    `/api/compatibility/device/${enc}`,
    `${CTX}/device`,
    { revalidate: DEVICE_DETAIL_REVALIDATE_S },
  );
}

export async function fetchOsDetail(
  slug: string,
  filter?: { status?: CompatibilityStatus },
): Promise<OsDetailPayload | null> {
  const qs =
    filter?.status != null ? `?status=${encodeURIComponent(filter.status)}` : "";
  const enc = encodeURIComponent(slug);
  return fetchCompatibilityJson<OsDetailPayload>(
    `/api/compatibility/os/${enc}${qs}`,
    `${CTX}/os-detail`,
  );
}
