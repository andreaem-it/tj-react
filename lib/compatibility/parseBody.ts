import type {
  CompatibilityStatus,
  DeviceInput,
  DeviceType,
  ExperienceLevel,
  LinkInput,
  OsInput,
  OsKind,
  SupportType,
} from "@/lib/compatibility/types";
import { parseDeviceType, parseOsKind, parseStatus } from "@/lib/compatibility/filters";

const DEVICE_TYPES = new Set<DeviceType>(["iphone", "ipad", "mac"]);
const OS_KINDS = new Set<OsKind>(["ios", "macos", "ipados"]);
const STATUSES = new Set<CompatibilityStatus>([
  "supported",
  "unsupported",
  "partial",
  "community",
]);
const SUPPORT = new Set<SupportType>(["official", "predicted", "opencore"]);
const EXP = new Set<ExperienceLevel>(["excellent", "good", "limited", "poor"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseDeviceInput(body: unknown): DeviceInput | null {
  if (!isRecord(body)) return null;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return null;
  const type = parseDeviceType(String(body.type ?? ""));
  if (!type || !DEVICE_TYPES.has(type)) return null;
  return {
    name,
    slug: typeof body.slug === "string" ? body.slug.trim() : undefined,
    type,
    releaseYear: parseYear(body.releaseYear),
    endOfSupportYear: parseYear(body.endOfSupportYear),
    chipset: parseOptionalString(body.chipset),
    notes: parseOptionalString(body.notes),
  };
}

export function parseDevicePatch(body: unknown): Partial<DeviceInput> | null {
  if (!isRecord(body)) return null;
  const out: Partial<DeviceInput> = {};
  if (typeof body.name === "string") out.name = body.name.trim();
  if (typeof body.slug === "string") out.slug = body.slug.trim();
  if (body.type !== undefined) {
    const t = parseDeviceType(String(body.type));
    if (!t || !DEVICE_TYPES.has(t)) return null;
    out.type = t;
  }
  if ("releaseYear" in body) out.releaseYear = parseYear(body.releaseYear);
  if ("endOfSupportYear" in body) out.endOfSupportYear = parseYear(body.endOfSupportYear);
  if ("chipset" in body) out.chipset = parseOptionalString(body.chipset);
  if ("notes" in body) out.notes = parseOptionalString(body.notes);
  return out;
}

export function parseOsInput(body: unknown): OsInput | null {
  if (!isRecord(body)) return null;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return null;
  const type = parseOsKind(String(body.type ?? ""));
  if (!type || !OS_KINDS.has(type)) return null;
  return {
    name,
    slug: typeof body.slug === "string" ? body.slug.trim() : undefined,
    type,
    releaseYear: parseYear(body.releaseYear),
    isFuture: Boolean(body.isFuture),
  };
}

export function parseOsPatch(body: unknown): Partial<OsInput> | null {
  if (!isRecord(body)) return null;
  const out: Partial<OsInput> = {};
  if (typeof body.name === "string") out.name = body.name.trim();
  if (typeof body.slug === "string") out.slug = body.slug.trim();
  if (body.type !== undefined) {
    const t = parseOsKind(String(body.type));
    if (!t || !OS_KINDS.has(t)) return null;
    out.type = t;
  }
  if ("releaseYear" in body) out.releaseYear = parseYear(body.releaseYear);
  if ("isFuture" in body) out.isFuture = Boolean(body.isFuture);
  return out;
}

export function parseLinkInput(body: unknown): LinkInput | null {
  if (!isRecord(body)) return null;
  const deviceId = Number(body.deviceId);
  const osId = Number(body.osId);
  if (!Number.isFinite(deviceId) || !Number.isFinite(osId)) return null;
  const status = parseStatus(String(body.status ?? ""));
  const supportType = String(body.supportType ?? "").toLowerCase() as SupportType;
  const experience = String(body.experience ?? "").toLowerCase() as ExperienceLevel;
  if (!status || !STATUSES.has(status)) return null;
  if (!SUPPORT.has(supportType)) return null;
  if (!EXP.has(experience)) return null;
  return {
    deviceId,
    osId,
    status,
    supportType,
    experience,
    notes: parseOptionalString(body.notes),
  };
}

export function parseLinkPatch(body: unknown): Partial<LinkInput> | null {
  if (!isRecord(body)) return null;
  const out: Partial<LinkInput> = {};
  if (body.deviceId !== undefined) {
    const n = Number(body.deviceId);
    if (!Number.isFinite(n)) return null;
    out.deviceId = n;
  }
  if (body.osId !== undefined) {
    const n = Number(body.osId);
    if (!Number.isFinite(n)) return null;
    out.osId = n;
  }
  if (body.status !== undefined) {
    const s = parseStatus(String(body.status));
    if (!s || !STATUSES.has(s)) return null;
    out.status = s;
  }
  if (body.supportType !== undefined) {
    const s = String(body.supportType).toLowerCase() as SupportType;
    if (!SUPPORT.has(s)) return null;
    out.supportType = s;
  }
  if (body.experience !== undefined) {
    const e = String(body.experience).toLowerCase() as ExperienceLevel;
    if (!EXP.has(e)) return null;
    out.experience = e;
  }
  if ("notes" in body) out.notes = parseOptionalString(body.notes);
  return out;
}

function parseYear(v: unknown): number | null | undefined {
  if (v === null || v === undefined || v === "") return v === null ? null : undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n);
}

function parseOptionalString(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (v === undefined) return undefined;
  if (typeof v !== "string") return undefined;
  return v.trim() || null;
}
