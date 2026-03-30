import type { CompatibilityStatus, DeviceType, OsKind } from "@/lib/compatibility/types";

const DEVICE_TYPES: DeviceType[] = ["iphone", "ipad", "mac"];
const OS_KINDS: OsKind[] = ["ios", "macos", "ipados"];
const STATUSES: CompatibilityStatus[] = [
  "supported",
  "unsupported",
  "partial",
  "community",
];

export function parseDeviceType(raw: string | null): DeviceType | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase() as DeviceType;
  return DEVICE_TYPES.includes(v) ? v : undefined;
}

export function parseOsKind(raw: string | null): OsKind | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase() as OsKind;
  return OS_KINDS.includes(v) ? v : undefined;
}

export function parseStatus(raw: string | null): CompatibilityStatus | undefined {
  if (!raw) return undefined;
  const v = raw.toLowerCase() as CompatibilityStatus;
  return STATUSES.includes(v) ? v : undefined;
}
