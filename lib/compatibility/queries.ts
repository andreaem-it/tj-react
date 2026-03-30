import type Database from "better-sqlite3";
import { getCompatibilityDb } from "@/lib/compatibility/db";
import { slugify } from "@/lib/compatibility/slug";
import type {
  CompatibilityRow,
  CompatibilityStatus,
  CompatibilityWithDevice,
  CompatibilityWithOs,
  Device,
  DeviceDetailPayload,
  DeviceInput,
  DeviceType,
  ExperienceLevel,
  LinkInput,
  MatrixRow,
  OperatingSystem,
  OsDetailPayload,
  OsInput,
  OsKind,
  SupportType,
} from "@/lib/compatibility/types";

function rowDevice(r: Record<string, unknown>): Device {
  return {
    id: r.id as number,
    name: r.name as string,
    slug: r.slug as string,
    type: r.type as DeviceType,
    releaseYear: r.release_year != null ? (r.release_year as number) : null,
    endOfSupportYear:
      r.end_of_support_year != null ? (r.end_of_support_year as number) : null,
    chipset: r.chipset != null ? (r.chipset as string) : null,
    notes: r.notes != null ? (r.notes as string) : null,
  };
}

function rowOs(r: Record<string, unknown>): OperatingSystem {
  return {
    id: r.id as number,
    name: r.name as string,
    slug: r.slug as string,
    type: r.type as OsKind,
    releaseYear: r.release_year != null ? (r.release_year as number) : null,
    isFuture: Boolean(r.is_future),
  };
}

function rowCompat(r: Record<string, unknown>): CompatibilityRow {
  return {
    id: r.id as number,
    deviceId: r.device_id as number,
    osId: r.os_id as number,
    status: r.status as CompatibilityStatus,
    supportType: r.support_type as SupportType,
    experience: r.experience as ExperienceLevel,
    notes: r.notes != null ? (r.notes as string) : null,
  };
}

export function listDevices(
  db: Database.Database,
  filter?: { type?: DeviceType },
): Device[] {
  if (filter?.type) {
    const stmt = db.prepare(
      `SELECT * FROM devices WHERE type = ? ORDER BY release_year DESC NULLS LAST, name ASC`,
    );
    return stmt.all(filter.type).map((x) => rowDevice(x as Record<string, unknown>));
  }
  const stmt = db.prepare(
    `SELECT * FROM devices ORDER BY type ASC, release_year DESC NULLS LAST, name ASC`,
  );
  return stmt.all().map((x) => rowDevice(x as Record<string, unknown>));
}

export function getDeviceBySlug(db: Database.Database, slug: string): Device | null {
  const stmt = db.prepare(`SELECT * FROM devices WHERE slug = ?`);
  const r = stmt.get(slug) as Record<string, unknown> | undefined;
  return r ? rowDevice(r) : null;
}

export function getOsBySlug(db: Database.Database, slug: string): OperatingSystem | null {
  const stmt = db.prepare(`SELECT * FROM operating_systems WHERE slug = ?`);
  const r = stmt.get(slug) as Record<string, unknown> | undefined;
  return r ? rowOs(r) : null;
}

/** Ultimo OS con supporto “supported” o “partial” (ordinato per anno di uscita). */
export function getLatestSupportedOsForDevice(
  db: Database.Database,
  deviceId: number,
): OperatingSystem | null {
  const stmt = db.prepare(`
    SELECT os.* FROM operating_systems os
    INNER JOIN compatibility c ON c.os_id = os.id
    WHERE c.device_id = ?
      AND c.status IN ('supported', 'partial')
    ORDER BY os.release_year DESC NULLS LAST, os.id DESC
    LIMIT 1
  `);
  const r = stmt.get(deviceId) as Record<string, unknown> | undefined;
  return r ? rowOs(r) : null;
}

export function listCompatibilityForDevice(
  db: Database.Database,
  deviceId: number,
): CompatibilityWithOs[] {
  const stmt = db.prepare(`
    SELECT c.*,
      os.id as os_id_join, os.name as os_name, os.slug as os_slug, os.type as os_type,
      os.release_year as os_release_year, os.is_future as os_is_future
    FROM compatibility c
    INNER JOIN operating_systems os ON os.id = c.os_id
    WHERE c.device_id = ?
    ORDER BY os.release_year DESC NULLS LAST, os.name ASC
  `);
  const rows = stmt.all(deviceId) as Record<string, unknown>[];
  return rows.map((r) => {
    const os: OperatingSystem = {
      id: r.os_id_join as number,
      name: r.os_name as string,
      slug: r.os_slug as string,
      type: r.os_type as OsKind,
      releaseYear: r.os_release_year != null ? (r.os_release_year as number) : null,
      isFuture: Boolean(r.os_is_future),
    };
    return {
      ...rowCompat({
        id: r.id,
        device_id: r.device_id,
        os_id: r.os_id,
        status: r.status,
        support_type: r.support_type,
        experience: r.experience,
        notes: r.notes,
      }),
      os,
    };
  });
}

export function getDeviceDetailBySlug(db: Database.Database, slug: string): DeviceDetailPayload | null {
  const device = getDeviceBySlug(db, slug);
  if (!device) return null;
  const latestSupportedOs = getLatestSupportedOsForDevice(db, device.id);
  const rows = listCompatibilityForDevice(db, device.id);
  return { device, latestSupportedOs, rows };
}

export function listOperatingSystems(
  db: Database.Database,
  filter?: { type?: OsKind },
): OperatingSystem[] {
  if (filter?.type) {
    const stmt = db.prepare(
      `SELECT * FROM operating_systems WHERE type = ? ORDER BY release_year DESC NULLS LAST, name ASC`,
    );
    return stmt.all(filter.type).map((x) => rowOs(x as Record<string, unknown>));
  }
  const stmt = db.prepare(
    `SELECT * FROM operating_systems ORDER BY type ASC, release_year DESC NULLS LAST, name ASC`,
  );
  return stmt.all().map((x) => rowOs(x as Record<string, unknown>));
}

export function listCompatibilityForOs(
  db: Database.Database,
  osId: number,
  filter?: { status?: CompatibilityStatus },
): CompatibilityWithDevice[] {
  let sql = `
    SELECT c.*,
      d.id as d_id, d.name as d_name, d.slug as d_slug, d.type as d_type,
      d.release_year as d_release_year, d.end_of_support_year as d_end_of_support_year,
      d.chipset as d_chipset, d.notes as d_notes
    FROM compatibility c
    INNER JOIN devices d ON d.id = c.device_id
    WHERE c.os_id = ?
  `;
  const params: (number | string)[] = [osId];
  if (filter?.status) {
    sql += ` AND c.status = ?`;
    params.push(filter.status);
  }
  sql += ` ORDER BY d.type ASC, d.release_year DESC NULLS LAST, d.name ASC`;
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as Record<string, unknown>[];
  return rows.map((r) => {
    const device: Device = {
      id: r.d_id as number,
      name: r.d_name as string,
      slug: r.d_slug as string,
      type: r.d_type as DeviceType,
      releaseYear: r.d_release_year != null ? (r.d_release_year as number) : null,
      endOfSupportYear:
        r.d_end_of_support_year != null ? (r.d_end_of_support_year as number) : null,
      chipset: r.d_chipset != null ? (r.d_chipset as string) : null,
      notes: r.d_notes != null ? (r.d_notes as string) : null,
    };
    return {
      ...rowCompat({
        id: r.id,
        device_id: r.device_id,
        os_id: r.os_id,
        status: r.status,
        support_type: r.support_type,
        experience: r.experience,
        notes: r.notes,
      }),
      device,
    };
  });
}

export function getOsDetailBySlug(
  db: Database.Database,
  slug: string,
  filter?: { status?: CompatibilityStatus },
): OsDetailPayload | null {
  const os = getOsBySlug(db, slug);
  if (!os) return null;
  const rows = listCompatibilityForOs(db, os.id, filter);
  return { os, rows };
}

export function insertDevice(db: Database.Database, input: DeviceInput): Device {
  const slug = input.slug?.trim() || slugify(input.name);
  const stmt = db.prepare(`
    INSERT INTO devices (name, slug, type, release_year, end_of_support_year, chipset, notes)
    VALUES (@name, @slug, @type, @release_year, @end_of_support_year, @chipset, @notes)
  `);
  const info = stmt.run({
    name: input.name.trim(),
    slug,
    type: input.type,
    release_year: input.releaseYear ?? null,
    end_of_support_year: input.endOfSupportYear ?? null,
    chipset: input.chipset ?? null,
    notes: input.notes ?? null,
  });
  const id = Number(info.lastInsertRowid);
  return getDeviceById(db, id)!;
}

export function getDeviceById(db: Database.Database, id: number): Device | null {
  const stmt = db.prepare(`SELECT * FROM devices WHERE id = ?`);
  const r = stmt.get(id) as Record<string, unknown> | undefined;
  return r ? rowDevice(r) : null;
}

export function updateDevice(db: Database.Database, id: number, input: Partial<DeviceInput>): Device | null {
  const cur = getDeviceById(db, id);
  if (!cur) return null;
  const next = {
    name: input.name?.trim() ?? cur.name,
    slug: input.slug?.trim() || (input.name ? slugify(input.name) : cur.slug),
    type: input.type ?? cur.type,
    releaseYear: input.releaseYear !== undefined ? input.releaseYear : cur.releaseYear,
    endOfSupportYear:
      input.endOfSupportYear !== undefined ? input.endOfSupportYear : cur.endOfSupportYear,
    chipset: input.chipset !== undefined ? input.chipset : cur.chipset,
    notes: input.notes !== undefined ? input.notes : cur.notes,
  };
  db.prepare(
    `UPDATE devices SET name = ?, slug = ?, type = ?, release_year = ?, end_of_support_year = ?, chipset = ?, notes = ? WHERE id = ?`,
  ).run(
    next.name,
    next.slug,
    next.type,
    next.releaseYear,
    next.endOfSupportYear,
    next.chipset,
    next.notes,
    id,
  );
  return getDeviceById(db, id);
}

export function deleteDevice(db: Database.Database, id: number): boolean {
  const r = db.prepare(`DELETE FROM devices WHERE id = ?`).run(id);
  return r.changes > 0;
}

export function insertOs(db: Database.Database, input: OsInput): OperatingSystem {
  const slug = input.slug?.trim() || slugify(input.name);
  const stmt = db.prepare(`
    INSERT INTO operating_systems (name, slug, type, release_year, is_future)
    VALUES (@name, @slug, @type, @release_year, @is_future)
  `);
  const info = stmt.run({
    name: input.name.trim(),
    slug,
    type: input.type,
    release_year: input.releaseYear ?? null,
    is_future: input.isFuture ? 1 : 0,
  });
  const id = Number(info.lastInsertRowid);
  return getOsById(db, id)!;
}

export function getOsById(db: Database.Database, id: number): OperatingSystem | null {
  const stmt = db.prepare(`SELECT * FROM operating_systems WHERE id = ?`);
  const r = stmt.get(id) as Record<string, unknown> | undefined;
  return r ? rowOs(r) : null;
}

export function updateOs(
  db: Database.Database,
  id: number,
  input: Partial<OsInput>,
): OperatingSystem | null {
  const cur = getOsById(db, id);
  if (!cur) return null;
  const next = {
    name: input.name?.trim() ?? cur.name,
    slug: input.slug?.trim() || (input.name ? slugify(input.name) : cur.slug),
    type: input.type ?? cur.type,
    releaseYear: input.releaseYear !== undefined ? input.releaseYear : cur.releaseYear,
    isFuture: input.isFuture !== undefined ? input.isFuture : cur.isFuture,
  };
  db.prepare(
    `UPDATE operating_systems SET name = ?, slug = ?, type = ?, release_year = ?, is_future = ? WHERE id = ?`,
  ).run(
    next.name,
    next.slug,
    next.type,
    next.releaseYear,
    next.isFuture ? 1 : 0,
    id,
  );
  return getOsById(db, id);
}

export function deleteOs(db: Database.Database, id: number): boolean {
  const r = db.prepare(`DELETE FROM operating_systems WHERE id = ?`).run(id);
  return r.changes > 0;
}

export function insertCompatibility(db: Database.Database, input: LinkInput): CompatibilityRow {
  const stmt = db.prepare(`
    INSERT INTO compatibility (device_id, os_id, status, support_type, experience, notes)
    VALUES (@device_id, @os_id, @status, @support_type, @experience, @notes)
  `);
  const info = stmt.run({
    device_id: input.deviceId,
    os_id: input.osId,
    status: input.status,
    support_type: input.supportType,
    experience: input.experience,
    notes: input.notes ?? null,
  });
  return getCompatibilityById(db, Number(info.lastInsertRowid))!;
}

export function getCompatibilityById(db: Database.Database, id: number): CompatibilityRow | null {
  const stmt = db.prepare(`SELECT * FROM compatibility WHERE id = ?`);
  const r = stmt.get(id) as Record<string, unknown> | undefined;
  return r ? rowCompat(r) : null;
}

export function updateCompatibility(
  db: Database.Database,
  id: number,
  patch: Partial<LinkInput>,
): CompatibilityRow | null {
  const cur = getCompatibilityById(db, id);
  if (!cur) return null;
  const next = {
    deviceId: patch.deviceId ?? cur.deviceId,
    osId: patch.osId ?? cur.osId,
    status: patch.status ?? cur.status,
    supportType: patch.supportType ?? cur.supportType,
    experience: patch.experience ?? cur.experience,
    notes: patch.notes !== undefined ? patch.notes : cur.notes,
  };
  db.prepare(
    `UPDATE compatibility SET device_id = ?, os_id = ?, status = ?, support_type = ?, experience = ?, notes = ? WHERE id = ?`,
  ).run(
    next.deviceId,
    next.osId,
    next.status,
    next.supportType,
    next.experience,
    next.notes,
    id,
  );
  return getCompatibilityById(db, id);
}

export function deleteCompatibility(db: Database.Database, id: number): boolean {
  const r = db.prepare(`DELETE FROM compatibility WHERE id = ?`).run(id);
  return r.changes > 0;
}

export function listAllCompatibilityMatrix(db: Database.Database): MatrixRow[] {
  const stmt = db.prepare(`
    SELECT c.*,
      d.id as d_id, d.name as d_name, d.slug as d_slug, d.type as d_type,
      d.release_year as d_release_year, d.end_of_support_year as d_end_of_support_year,
      d.chipset as d_chipset, d.notes as d_notes,
      o.id as o_id, o.name as o_name, o.slug as o_slug, o.type as o_type,
      o.release_year as o_release_year, o.is_future as o_is_future
    FROM compatibility c
    INNER JOIN devices d ON d.id = c.device_id
    INNER JOIN operating_systems o ON o.id = c.os_id
    ORDER BY d.type, d.name, o.release_year DESC
  `);
  const rows = stmt.all() as Record<string, unknown>[];
  return rows.map((r) => ({
    ...rowCompat({
      id: r.id,
      device_id: r.device_id,
      os_id: r.os_id,
      status: r.status,
      support_type: r.support_type,
      experience: r.experience,
      notes: r.notes,
    }),
    device: {
      id: r.d_id as number,
      name: r.d_name as string,
      slug: r.d_slug as string,
      type: r.d_type as DeviceType,
      releaseYear: r.d_release_year != null ? (r.d_release_year as number) : null,
      endOfSupportYear:
        r.d_end_of_support_year != null ? (r.d_end_of_support_year as number) : null,
      chipset: r.d_chipset != null ? (r.d_chipset as string) : null,
      notes: r.d_notes != null ? (r.d_notes as string) : null,
    },
    os: {
      id: r.o_id as number,
      name: r.o_name as string,
      slug: r.o_slug as string,
      type: r.o_type as OsKind,
      releaseYear: r.o_release_year != null ? (r.o_release_year as number) : null,
      isFuture: Boolean(r.o_is_future),
    },
  }));
}

export function withDb<T>(fn: (db: Database.Database) => T): T {
  return fn(getCompatibilityDb());
}
