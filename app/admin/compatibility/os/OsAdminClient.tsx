"use client";

import { useCallback, useEffect, useState } from "react";
import type { OperatingSystem, OsKind } from "@/lib/compatibility/types";

const KINDS: OsKind[] = ["ios", "macos", "ipados"];

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? res.statusText);
  }
  return data as T;
}

export function OsAdminClient() {
  const [list, setList] = useState<OperatingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "ios" as OsKind,
    releaseYear: "",
    isFuture: false,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchJson<{ operatingSystems: OperatingSystem[] }>(
        "/api/admin/compatibility/os",
      );
      setList(data.operatingSystems);
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
    setForm({ name: "", slug: "", type: "ios", releaseYear: "", isFuture: false });
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
        isFuture: form.isFuture,
      };
      if (editingId != null) {
        await fetchJson(`/api/admin/compatibility/os/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetchJson("/api/admin/compatibility/os", {
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
    if (!confirm("Eliminare questo OS e le relative compatibilità?")) return;
    setError(null);
    try {
      await fetchJson(`/api/admin/compatibility/os/${id}`, { method: "DELETE" });
      await load();
      if (editingId === id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    }
  }

  function startEdit(o: OperatingSystem) {
    setEditingId(o.id);
    setForm({
      name: o.name,
      slug: o.slug,
      type: o.type,
      releaseYear: o.releaseYear != null ? String(o.releaseYear) : "",
      isFuture: o.isFuture,
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
        <h2 className="text-lg font-semibold mb-3">{editingId != null ? "Modifica" : "Nuovo"} OS</h2>
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
            <span className="text-xs text-[var(--muted)]">Slug</span>
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
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as OsKind }))}
            >
              {KINDS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-xs text-[var(--muted)]">Anno</span>
            <input
              type="number"
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--content-bg)] px-3 py-2 text-sm"
              value={form.releaseYear}
              onChange={(e) => setForm((f) => ({ ...f, releaseYear: e.target.value }))}
            />
          </label>
          <label className="flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={form.isFuture}
              onChange={(e) => setForm((f) => ({ ...f, isFuture: e.target.checked }))}
            />
            <span className="text-sm">Futuro / annuncio</span>
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
                Annulla
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Elenco</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[520px] text-sm text-left">
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
              {list.map((o) => (
                <tr key={o.id} className="border-t border-[var(--border)]">
                  <td className="p-2">{o.name}</td>
                  <td className="p-2">{o.type}</td>
                  <td className="p-2">{o.releaseYear ?? "—"}</td>
                  <td className="p-2 font-mono text-xs">{o.slug}</td>
                  <td className="p-2 text-right space-x-2">
                    <button type="button" className="text-[var(--accent)] text-xs" onClick={() => startEdit(o)}>
                      Modifica
                    </button>
                    <button
                      type="button"
                      className="text-red-400 text-xs"
                      onClick={() => void remove(o.id)}
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
