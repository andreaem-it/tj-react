"use client";

import { useCallback, useEffect, useState } from "react";
import type { Device, DeviceType } from "@/lib/compatibility/types";

const TYPES: DeviceType[] = ["iphone", "ipad", "mac"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? res.statusText);
  }
  return data as T;
}

export function DevicesAdminClient() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "iphone" as DeviceType,
    releaseYear: "",
    endOfSupportYear: "",
    chipset: "",
    notes: "",
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchJson<{ devices: Device[] }>("/api/admin/compatibility/device");
      setDevices(data.devices);
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
    setEditingId(null);
    setForm({
      name: "",
      slug: "",
      type: "iphone",
      releaseYear: "",
      endOfSupportYear: "",
      chipset: "",
      notes: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        type: form.type,
        releaseYear: form.releaseYear ? Number(form.releaseYear) : undefined,
        endOfSupportYear: form.endOfSupportYear ? Number(form.endOfSupportYear) : undefined,
        chipset: form.chipset.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (editingId != null) {
        await fetchJson(`/api/admin/compatibility/device/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetchJson("/api/admin/compatibility/device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Eliminare questo dispositivo e le relative righe di compatibilità?")) return;
    setError(null);
    try {
      await fetchJson(`/api/admin/compatibility/device/${id}`, { method: "DELETE" });
      await load();
      if (editingId === id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    }
  }

  function startEdit(d: Device) {
    setEditingId(d.id);
    setForm({
      name: d.name,
      slug: d.slug,
      type: d.type,
      releaseYear: d.releaseYear != null ? String(d.releaseYear) : "",
      endOfSupportYear: d.endOfSupportYear != null ? String(d.endOfSupportYear) : "",
      chipset: d.chipset ?? "",
      notes: d.notes ?? "",
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
        <h2 className="text-lg font-semibold mb-3">{editingId != null ? "Modifica" : "Nuovo"} dispositivo</h2>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 max-w-3xl">
          <label className="sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">Nome</span>
            <input
              required
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label>
            <span className="text-xs text-[var(--muted)]">Slug (opz.)</span>
            <input
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </label>
          <label>
            <span className="text-xs text-[var(--muted)]">Tipo</span>
            <select
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DeviceType }))}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs text-[var(--muted)]">Anno uscita</span>
            <input
              type="number"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.releaseYear}
              onChange={(e) => setForm((f) => ({ ...f, releaseYear: e.target.value }))}
            />
          </label>
          <label>
            <span className="text-xs text-[var(--muted)]">Fine supporto</span>
            <input
              type="number"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.endOfSupportYear}
              onChange={(e) => setForm((f) => ({ ...f, endOfSupportYear: e.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">Chipset</span>
            <input
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.chipset}
              onChange={(e) => setForm((f) => ({ ...f, chipset: e.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">Note</span>
            <textarea
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm min-h-[72px]"
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
              {saving ? "Salvataggio…" : editingId != null ? "Aggiorna" : "Crea"}
            </button>
            {editingId != null && (
              <button type="button" onClick={resetForm} className="text-sm text-[var(--muted)] underline">
                Annulla modifica
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Elenco</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[560px] text-sm text-left">
            <thead className="bg-[var(--sidebar-bg)] text-[var(--muted)]">
              <tr>
                <th className="p-2 font-medium">Nome</th>
                <th className="p-2 font-medium">Tipo</th>
                <th className="p-2 font-medium">Anno</th>
                <th className="p-2 font-medium">Slug</th>
                <th className="p-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id} className="border-t border-[var(--border)]">
                  <td className="p-2">{d.name}</td>
                  <td className="p-2">{d.type}</td>
                  <td className="p-2">{d.releaseYear ?? "—"}</td>
                  <td className="p-2 font-mono text-xs">{d.slug}</td>
                  <td className="p-2 text-right space-x-2">
                    <button type="button" className="text-[var(--accent)] text-xs" onClick={() => startEdit(d)}>
                      Modifica
                    </button>
                    <button
                      type="button"
                      className="text-red-400 text-xs"
                      onClick={() => void remove(d.id)}
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
