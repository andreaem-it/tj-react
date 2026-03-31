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

async function fetchCompatJson<T>(path: string): Promise<T | null> {
  const url = resolvePublicApiUrl(path);
  const res = await fetch(url, { cache: "no-store", headers: jsonHeaders });
  if (!res.ok) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
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
