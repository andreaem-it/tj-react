import { fetchTjProxyJson } from "@/lib/tjApiClient";
import type {
  CompatibilityStatus,
  Device,
  DeviceDetailPayload,
  DeviceType,
  OperatingSystem,
  OsDetailPayload,
} from "@/lib/compatibility/types";

const CTX = "compatibility";

/** Dati pubblici compatibilità: stesso stack di `fetchPosts` / Price Radar (`fetchWithFallback` + proxy `/api/compatibility/*`). */
export async function fetchCompatibilityDevices(type?: DeviceType): Promise<Device[]> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  const data = await fetchTjProxyJson<{ devices: Device[] }>(
    `/api/compatibility/devices${qs}`,
    `${CTX}/devices`,
  );
  return data?.devices ?? [];
}

export async function fetchCompatibilityOsList(): Promise<OperatingSystem[]> {
  const data = await fetchTjProxyJson<{ operatingSystems: OperatingSystem[] }>(
    `/api/compatibility/os`,
    `${CTX}/os`,
  );
  return data?.operatingSystems ?? [];
}

export async function fetchDeviceDetail(slug: string): Promise<DeviceDetailPayload | null> {
  const enc = encodeURIComponent(slug);
  return fetchTjProxyJson<DeviceDetailPayload>(
    `/api/compatibility/device/${enc}`,
    `${CTX}/device`,
  );
}

export async function fetchOsDetail(
  slug: string,
  filter?: { status?: CompatibilityStatus },
): Promise<OsDetailPayload | null> {
  const qs =
    filter?.status != null ? `?status=${encodeURIComponent(filter.status)}` : "";
  const enc = encodeURIComponent(slug);
  return fetchTjProxyJson<OsDetailPayload>(
    `/api/compatibility/os/${enc}${qs}`,
    `${CTX}/os-detail`,
  );
}
