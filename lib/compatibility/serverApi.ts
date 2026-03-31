import { getTjApiBaseUrl } from "@/lib/config/tjApi";
import { resolvePublicApiUrl } from "@/lib/tjApiClient";
import type {
  CompatibilityStatus,
  Device,
  DeviceDetailPayload,
  DeviceType,
  OperatingSystem,
  OsDetailPayload,
} from "@/lib/compatibility/types";

const jsonHeaders = { Accept: "application/json" } as const;
const FETCH_TIMEOUT_MS = 15_000;

/**
 * URL per le fetch SSR: stesso path del proxy (`/api/compatibility/*`).
 * Se `TJ_API_BASE_URL` è impostato (come per il proxy), chiama tj-api direttamente
 * e si evita un HTTP verso lo stesso Next in dev → deadlock sul reload.
 * Altrimenti `resolvePublicApiUrl` (relativo o `NEXT_PUBLIC_TJ_API_BASE_URL`), invariato.
 */
function resolveCompatFetchUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const tj = getTjApiBaseUrl();
  if (tj) {
    return `${tj.replace(/\/$/, "")}${p}`;
  }
  return resolvePublicApiUrl(path);
}

async function fetchCompatJson<T>(path: string): Promise<T | null> {
  const url = resolveCompatFetchUrl(path);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: jsonHeaders,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  } catch {
    /** Rete, timeout, TLS, URL non valida: non propagare (in prod RSC mostrerebbe digest generico). */
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Dati pubblici compatibilità (tj-api via proxy `/api/compatibility/*`). */
export async function fetchCompatibilityDevices(type?: DeviceType): Promise<Device[]> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  const data = await fetchCompatJson<{ devices: Device[] }>(`/api/compatibility/devices${qs}`);
  return data?.devices ?? [];
}

export async function fetchCompatibilityOsList(): Promise<OperatingSystem[]> {
  const data = await fetchCompatJson<{ operatingSystems: OperatingSystem[] }>(
    `/api/compatibility/os`,
  );
  return data?.operatingSystems ?? [];
}

export async function fetchDeviceDetail(slug: string): Promise<DeviceDetailPayload | null> {
  const enc = encodeURIComponent(slug);
  return fetchCompatJson<DeviceDetailPayload>(`/api/compatibility/device/${enc}`);
}

export async function fetchOsDetail(
  slug: string,
  filter?: { status?: CompatibilityStatus },
): Promise<OsDetailPayload | null> {
  const qs =
    filter?.status != null ? `?status=${encodeURIComponent(filter.status)}` : "";
  const enc = encodeURIComponent(slug);
  return fetchCompatJson<OsDetailPayload>(`/api/compatibility/os/${enc}${qs}`);
}
