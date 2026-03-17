"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type MediaItem = {
  id: number;
  path: string;
  url_full: string;
  url_thumb: string;
  url_small: string;
  url_medium: string;
  url_large: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
  created_at: string;
};

type ListResponse = {
  items: MediaItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  availableMonths?: string[];
  currentMonth?: string;
};

const PER_PAGE = 24;

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMonthLabel(value: string): string {
  const [y, m] = value.split("-");
  if (!y || !m) return value;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

export default function MediaGallery() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [month, setMonth] = useState<string>("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDropzone, setShowDropzone] = useState(false);

  const fetchList = useCallback(async (p = 1, m = "") => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/media?page=${p}&perPage=${PER_PAGE}${
          m ? `&month=${encodeURIComponent(m)}` : ""
        }`
      );
      if (!res.ok) throw new Error("Errore caricamento media");
      const data: ListResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
      if (data.availableMonths) {
        setAvailableMonths(data.availableMonths);
      }
      if (typeof data.currentMonth === "string") {
        setMonth(data.currentMonth);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(1, "");
  }, [fetchList]);

  const onUpload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      setError(null);
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file.type.startsWith("image/")) continue;
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/admin/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error((data as { error?: string }).error ?? "Upload fallito");
          }
        }
        await fetchList(1, month);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload fallito");
      } finally {
        setUploading(false);
      }
    },
    [fetchList, month]
  );

  const copyUrl = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  if (loading && items.length === 0) {
    return (
      <div className="rounded-xl bg-white/5 border border-white/10 p-8 text-center text-white/60">
        Caricamento libreria…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">Libreria media</h1>
          {availableMonths.length > 0 && (
            <select
              value={month}
              onChange={(e) => {
                const value = e.target.value;
                setMonth(value);
                fetchList(1, value);
              }}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
            >
              <option value="">Tutti i mesi</option>
              {availableMonths.map((value) => (
                <option key={value} value={value}>
                  {formatMonthLabel(value)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              onUpload(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => {
              setShowDropzone((v) => !v);
              if (!showDropzone) {
                // se sto aprendo il pannello, apro subito il file picker
                inputRef.current?.click();
              }
            }}
            disabled={uploading}
            className="px-4 py-2 rounded-lg bg-[#f5a623] text-[#1a1a1a] font-medium hover:bg-[#e09520] disabled:opacity-50 transition-colors"
          >
            {uploading
              ? "Caricamento…"
              : showDropzone
                ? "Nascondi caricamento"
                : "Aggiungi file"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Zona drop (stile WordPress) – visibile solo quando showDropzone è attivo */}
      {showDropzone && (
        <div
          className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center text-white/60 hover:border-[#f5a623]/50 hover:text-white/80 transition-colors cursor-pointer"
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add("border-[#f5a623]/50");
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove("border-[#f5a623]/50");
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("border-[#f5a623]/50");
            onUpload(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
        >
          Trascina qui le immagini oppure clicca per selezionare. JPEG, PNG, GIF, WebP (max 10 MB).
        </div>
      )}

      {items.length === 0 && !loading ? (
        <div className="rounded-xl bg-white/5 border border-white/10 p-12 text-center text-white/60">
          Nessun file nella libreria. Carica le prime immagini.
        </div>
      ) : (
        <>
          <p className="text-sm text-white/60">
            {total} elemento{total !== 1 ? "i" : ""} in totale
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-white/10 bg-white/5 overflow-hidden group cursor-pointer"
                onClick={() => setSelected(item)}
              >
                <div className="aspect-square bg-white/5 flex items-center justify-center p-1">
                  <img
                    src={item.url_thumb}
                    alt=""
                    className="w-full h-full object-cover rounded"
                  />
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => fetchList(page - 1, month)}
                disabled={page <= 1}
                className="px-3 py-1 rounded border border-white/20 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Precedente
              </button>
              <span className="text-sm text-white/70">
                Pagina {page} di {totalPages}
              </span>
              <button
                type="button"
                onClick={() => fetchList(page + 1, month)}
                disabled={page >= totalPages}
                className="px-3 py-1 rounded border border-white/20 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Successiva
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal dettaglio (stile WordPress: dettagli allegato) */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-[#1f1f1f] border border-white/10 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Area immagine grande a sinistra */}
            <div className="flex-1 bg-black flex items-center justify-center p-4">
              <img
                src={selected.url_large || selected.url_full}
                alt=""
                className="max-h-[80vh] w-auto max-w-full object-contain"
              />
            </div>

            {/* Colonna dettagli a destra */}
            <div className="w-80 border-l border-white/10 bg-[#252525] flex flex-col">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">Dettagli allegato</h3>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="p-4 space-y-3 text-sm text-white/80 overflow-y-auto">
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">
                    Nome file
                  </p>
                  <p className="truncate" title={selected.path}>
                    {selected.path.split("/").pop() ?? selected.path}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-white/50">Caricato il</p>
                    <p>{formatDate(selected.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Dimensione</p>
                    <p>{formatSize(selected.file_size)}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Dimensioni</p>
                    <p>
                      {selected.width && selected.height
                        ? `${selected.width} × ${selected.height}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/50">Tipo MIME</p>
                    <p>{selected.mime_type || "image/*"}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-2">
                  <p className="text-xs text-white/50 uppercase tracking-wider">
                    URL immagine (clic per copiare)
                  </p>
                  <div className="space-y-1">
                    {[
                      { label: "Completa (full)", url: selected.url_full },
                      { label: "Large", url: selected.url_large },
                      { label: "Medium", url: selected.url_medium },
                      { label: "Small", url: selected.url_small },
                      { label: "Thumb", url: selected.url_thumb },
                    ].map(({ label, url }) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-white/60 w-20 shrink-0 text-xs">
                          {label}
                        </span>
                        <button
                          type="button"
                          onClick={() => url && copyUrl(url)}
                          className="text-left truncate flex-1 text-[#f5a623] hover:underline text-xs disabled:opacity-40"
                          title={url}
                          disabled={!url}
                        >
                          {url || "—"}
                        </button>
                        {copied === url && url && (
                          <span className="text-green-400 text-[10px]">Copiato</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
