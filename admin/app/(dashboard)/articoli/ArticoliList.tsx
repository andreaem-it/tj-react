"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Article = {
  id: number;
  slug: string;
  title: string;
  status: string;
  updated_at: string;
  category_name?: string;
};

type ApiResponse = {
  articles: Article[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export default function ArticoliList() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/articles?perPage=20")
      .then((res) => {
        if (!res.ok) throw new Error("Errore caricamento");
        return res.json();
      })
      .then((d: ApiResponse) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Errore");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="h-12 bg-white/5 animate-pulse" />
        <div className="divide-y divide-white/10">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
        {error}
      </div>
    );
  }

  if (!data || data.articles.length === 0) {
    return (
      <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center text-white/60">
        <p className="mb-4">Nessun articolo.</p>
        <Link
          href="/articoli/nuovo"
          className="text-[#f5a623] hover:underline"
        >
          Crea il primo articolo
        </Link>
      </div>
    );
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-sm font-medium text-white/80">
                Titolo
              </th>
              <th className="px-4 py-3 text-sm font-medium text-white/80">
                Stato
              </th>
              <th className="px-4 py-3 text-sm font-medium text-white/80">
                Categoria
              </th>
              <th className="px-4 py-3 text-sm font-medium text-white/80">
                Modificato
              </th>
              <th className="px-4 py-3 text-sm font-medium text-white/80 w-24">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody>
            {data.articles.map((a) => (
              <tr
                key={a.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/articoli/${a.id}/edit`}
                    className="font-medium text-white hover:text-[#f5a623] transition-colors"
                  >
                    {a.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs ${
                      a.status === "published"
                        ? "bg-green-500/20 text-green-300"
                        : a.status === "archived"
                          ? "bg-white/10 text-white/60"
                          : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {a.status === "published"
                      ? "Pubblicato"
                      : a.status === "archived"
                        ? "Archiviato"
                        : "Bozza"}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/70 text-sm">
                  {a.category_name || "—"}
                </td>
                <td className="px-4 py-3 text-white/60 text-sm">
                  {formatDate(a.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/articoli/${a.id}/edit`}
                    className="text-sm text-[#f5a623] hover:underline"
                  >
                    Modifica
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-white/10 text-sm text-white/60">
          Pagina {data.page} di {data.totalPages} ({data.total} articoli)
        </div>
      )}
    </div>
  );
}
