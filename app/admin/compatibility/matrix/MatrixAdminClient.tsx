"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CompatibilityStatus,
  Device,
  ExperienceLevel,
  MatrixRow,
  OperatingSystem,
  SupportType,
} from "@/lib/compatibility/types";

const STATUSES: CompatibilityStatus[] = ["supported", "unsupported", "partial", "community"];
const SUPPORT: SupportType[] = ["official", "predicted", "opencore"];
const EXP: ExperienceLevel[] = ["excellent", "good", "limited", "poor"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? res.statusText);
  }
  return data as T;
}

export function MatrixAdminClient() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [operatingSystems, setOperatingSystems] = useState<OperatingSystem[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    deviceId: "",
    osId: "",
    status: "supported" as CompatibilityStatus,
    supportType: "official" as SupportType,
    experience: "good" as ExperienceLevel,
    notes: "",
  });
  const [editingLinkId, setEditingLinkId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [dRes, oRes, mRes] = await Promise.all([
        fetchJson<{ devices: Device[] }>("/api/admin/compatibility/device"),
        fetchJson<{ operatingSystems: OperatingSystem[] }>("/api/admin/compatibility/os"),
        fetchJson<{ matrix: MatrixRow[] }>("/api/admin/compatibility/matrix"),
      ]);
      setDevices(dRes.devices);
      setOperatingSystems(oRes.operatingSystems);
      setMatrix(mRes.matrix);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function resetForm() {
    setEditingLinkId(null);
    setForm({
      deviceId: "",
      osId: "",
      status: "supported",
      supportType: "official",
      experience: "good",
      notes: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const deviceId = Number(form.deviceId);
    const osId = Number(form.osId);
    if (!Number.isFinite(deviceId) || !Number.isFinite(osId)) {
      setError("Seleziona dispositivo e OS");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        deviceId,
        osId,
        status: form.status,
        supportType: form.supportType,
        experience: form.experience,
        notes: form.notes.trim() || null,
      };
      if (editingLinkId != null) {
        await fetchJson(`/api/admin/compatibility/link/${editingLinkId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetchJson("/api/admin/compatibility/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  async function removeLink(id: number) {
    if (!confirm("Eliminare questa riga?")) return;
    setError(null);
    try {
      await fetchJson(`/api/admin/compatibility/link/${id}`, { method: "DELETE" });
      await load();
      if (editingLinkId === id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    }
  }

  function startEdit(row: MatrixRow) {
    setEditingLinkId(row.id);
    setForm({
      deviceId: String(row.deviceId),
      osId: String(row.osId),
      status: row.status,
      supportType: row.supportType,
      experience: row.experience,
      notes: row.notes ?? "",
    });
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Caricamento…</p>;
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {editingLinkId != null ? "Modifica collegamento" : "Nuovo collegamento"}
        </h2>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 max-w-3xl">
          <label>
            <span className="text-xs text-[var(--muted)]">Dispositivo</span>
            <select
              required
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.deviceId}
              onChange={(e) => setForm((f) => ({ ...f, deviceId: e.target.value }))}
            >
              <option value="">—</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs text-[var(--muted)]">Sistema operativo</span>
            <select
              required
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.osId}
              onChange={(e) => setForm((f) => ({ ...f, osId: e.target.value }))}
            >
              <option value="">—</option>
              {operatingSystems.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs text-[var(--muted)]">Stato</span>
            <select
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as CompatibilityStatus }))
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs text-[var(--muted)]">Tipo supporto</span>
            <select
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.supportType}
              onChange={(e) =>
                setForm((f) => ({ ...f, supportType: e.target.value as SupportType }))
              }
            >
              {SUPPORT.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">Esperienza</span>
            <select
              className="mt-1 w-full max-w-md rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.experience}
              onChange={(e) =>
                setForm((f) => ({ ...f, experience: e.target.value as ExperienceLevel }))
              }
            >
              {EXP.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">Note</span>
            <textarea
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm min-h-[64px]"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-[var(--accent)] text-black px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Salvataggio…" : editingLinkId != null ? "Aggiorna" : "Crea"}
            </button>
            {editingLinkId != null && (
              <button type="button" onClick={resetForm} className="text-sm text-[var(--muted)] underline">
                Annulla
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Matrice ({matrix.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[720px] text-sm text-left">
            <thead className="bg-[var(--sidebar-bg)] text-[var(--muted)]">
              <tr>
                <th className="p-2 font-medium">Dispositivo</th>
                <th className="p-2 font-medium">OS</th>
                <th className="p-2 font-medium">Stato</th>
                <th className="p-2 font-medium">Tipo</th>
                <th className="p-2 font-medium">Exp</th>
                <th className="p-2 font-medium">Note</th>
                <th className="p-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)]">
                  <td className="p-2">{row.device.name}</td>
                  <td className="p-2">{row.os.name}</td>
                  <td className="p-2">{row.status}</td>
                  <td className="p-2">{row.supportType}</td>
                  <td className="p-2">{row.experience}</td>
                  <td className="p-2 max-w-[140px] truncate text-[var(--muted)]">{row.notes || "—"}</td>
                  <td className="p-2 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-[var(--accent)] text-xs"
                      onClick={() => startEdit(row)}
                    >
                      Modifica
                    </button>
                    <button
                      type="button"
                      className="text-red-400 text-xs"
                      onClick={() => void removeLink(row.id)}
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
