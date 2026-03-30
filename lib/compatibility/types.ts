export type DeviceType = "iphone" | "ipad" | "mac";

export type OsKind = "ios" | "macos" | "ipados";

export type CompatibilityStatus =
  | "supported"
  | "unsupported"
  | "partial"
  | "community";

export type SupportType = "official" | "predicted" | "opencore";

export type ExperienceLevel = "excellent" | "good" | "limited" | "poor";

export type Device = {
  id: number;
  name: string;
  slug: string;
  type: DeviceType;
  releaseYear: number | null;
  endOfSupportYear: number | null;
  chipset: string | null;
  notes: string | null;
  imageUrl: string | null;
  imageR2Key: string | null;
};

export type OperatingSystem = {
  id: number;
  name: string;
  slug: string;
  type: OsKind;
  releaseYear: number | null;
  isFuture: boolean;
};

export type CompatibilityRow = {
  id: number;
  deviceId: number;
  osId: number;
  status: CompatibilityStatus;
  supportType: SupportType;
  experience: ExperienceLevel;
  notes: string | null;
};

export type CompatibilityWithOs = CompatibilityRow & {
  os: OperatingSystem;
};

export type CompatibilityWithDevice = CompatibilityRow & {
  device: Device;
};

export type DeviceDetailPayload = {
  device: Device;
  latestSupportedOs: OperatingSystem | null;
  rows: CompatibilityWithOs[];
};

export type OsDetailPayload = {
  os: OperatingSystem;
  rows: CompatibilityWithDevice[];
};

export type DeviceInput = {
  name: string;
  slug?: string;
  type: DeviceType;
  releaseYear?: number | null;
  endOfSupportYear?: number | null;
  chipset?: string | null;
  notes?: string | null;
};

export type OsInput = {
  name: string;
  slug?: string;
  type: OsKind;
  releaseYear?: number | null;
  isFuture?: boolean;
};

export type LinkInput = {
  deviceId: number;
  osId: number;
  status: CompatibilityStatus;
  supportType: SupportType;
  experience: ExperienceLevel;
  notes?: string | null;
};

export type MatrixRow = CompatibilityRow & {
  device: Device;
  os: OperatingSystem;
};
