import { getTjApiBaseUrl } from "@/lib/config/tjApi";
import { getPublicTjApiBaseUrl } from "@/lib/tjApiClient";
import type {
  CompatibilityStatus,
  Device,
  DeviceDetailPayload,
  DeviceType,
  OperatingSystem,
  OsDetailPayload,
} from "@/lib/compatibility/types";

const jsonHeaders = { Accept: "application/json" } as const;
const FETCH_TIMEOUT_MS = 12_000;

/**
 * URL assoluto verso tj-api (mai path relativo `/api/...`).
 * Un fetch relativo dai Server Component verso il proxy Next sullo stesso processo
 * può andare in deadlock e bloccare il tab del browser al reload.
 */
function resolveCompatUpstreamUrl(pathWithQuery: string): string | null {
  const p = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const server = getTjApiBaseUrl();
  if (server) return `${server}${p}`;
  const pub = getPublicTjApiBaseUrl();
  if (pub) return `${pub}${p}`;
  return null;
}

async function fetchCompatJson<T>(pathWithQuery: string): Promise<T | null> {
  const url = resolveCompatUpstreamUrl(pathWithQuery);
  if (url == null) {
    return null;
  }

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
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Dati pubblici compatibilità (tj-api, path `/api/compatibility/*`; il proxy Next resta per il browser). */
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
