"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ArticleHtmlEditorHandle } from "@/components/admin/ArticleHtmlEditor";
import { initialHtmlFromStoredContent } from "@/lib/legacyBlockNoteToHtml";

const ArticleHtmlEditor = dynamic(
  () => import("@/components/admin/ArticleHtmlEditor"),
  { ssr: false }
);

/** Genera slug da titolo (minuscolo, trattini, senza accenti) */
function slugFromTitle(title: string): string {
  const normalized = title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "";
}

const CATEGORY_OPTIONS = [
  { value: "", label: "— Nessuna —" },
  { value: "apple", label: "Apple" },
  { value: "apps", label: "Apps" },
  { value: "tech", label: "Tech" },
  { value: "gaming", label: "Gaming" },
  { value: "smart-home", label: "Smart Home" },
  { value: "ia", label: "IA" },
  { value: "offerte", label: "Offerte" },
];

type ArticleStatus = "draft" | "published" | "private";

type ArticleFormProps = {
  articleId?: number;
};

export default function ArticoloForm({ articleId }: ArticleFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [publishedAt, setPublishedAt] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageAlt, setImageAlt] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(!articleId);
  /** Contenuto iniziale dell'editor: impostato solo al load, mai dall'onChange (evita perdita focus) */
  const [initialEditorContent, setInitialEditorContent] = useState<string>("");
  const editorRef = useRef<ArticleHtmlEditorHandle | null>(null);

  // Stato per media picker
  type MediaItem = {
    id: number;
    path: string;
    url_full: string;
    url_thumb: string;
    url_small: string;
    url_medium: string;
    url_large: string;
  };

  type MediaListResponse = {
    items: MediaItem[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    availableMonths?: string[];
    currentMonth?: string;
  };

  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<"inline" | "featured">("inline");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaTotalPages, setMediaTotalPages] = useState(1);
  const [mediaMonth, setMediaMonth] = useState<string>("");
  const [mediaMonths, setMediaMonths] = useState<string[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const slug = useMemo(() => slugFromTitle(title), [title]);

  const formatMonthLabel = useCallback((value: string): string => {
    const [y, m] = value.split("-");
    if (!y || !m) return value;
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  }, []);

  const loadMedia = useCallback(
    async (page = 1, month = "") => {
      setMediaLoading(true);
      setMediaError(null);
      try {
        const res = await fetch(
          `/api/admin/media?page=${page}&perPage=24${
            month ? `&month=${encodeURIComponent(month)}` : ""
          }`
        );
        if (!res.ok) throw new Error("Errore caricamento media");
        const data: MediaListResponse = await res.json();
        setMediaItems(data.items);
        setMediaPage(data.page);
        setMediaTotalPages(data.totalPages);
        if (data.availableMonths) setMediaMonths(data.availableMonths);
        if (typeof data.currentMonth === "string") setMediaMonth(data.currentMonth);
      } catch (e) {
        setMediaError(e instanceof Error ? e.message : "Errore caricamento media");
      } finally {
        setMediaLoading(false);
      }
    },
    []
  );

  const loadArticle = useCallback(() => {
    if (!articleId) return;
    fetch(`/api/admin/articles/${articleId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Articolo non trovato");
        return res.json();
      })
      .then((a: Record<string, unknown>) => {
        const contentStr = typeof a.content === "string" ? a.content : "";
        const htmlInitial = initialHtmlFromStoredContent(contentStr);
        setTitle(typeof a.title === "string" ? a.title : "");
        setContent(htmlInitial);
        setInitialEditorContent(htmlInitial);
        const s = a.status === "published" ? "published" : a.status === "private" ? "private" : "draft";
        setStatus(s as ArticleStatus);
        setCategorySlug(typeof a.category_slug === "string" ? a.category_slug : "");
        setMetaTitle(typeof (a as { meta_title?: string }).meta_title === "string" ? (a as { meta_title: string }).meta_title : "");
        setMetaDescription(typeof (a as { meta_description?: string }).meta_description === "string" ? (a as { meta_description: string }).meta_description : "");
        setImageUrl(typeof (a as { image_url?: string }).image_url === "string" ? (a as { image_url: string }).image_url : "");
        setImageAlt(typeof (a as { image_alt?: string }).image_alt === "string" ? (a as { image_alt: string }).image_alt : "");
        if (a.published_at && typeof a.published_at === "string") {
          try {
            const d = new Date(a.published_at);
            if (!Number.isNaN(d.getTime())) setPublishedAt(d.toISOString().slice(0, 16));
          } catch {
            setPublishedAt("");
          }
        } else {
          setPublishedAt("");
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [articleId]);

  useEffect(() => {
    if (articleId) loadArticle();
  }, [articleId, loadArticle]);

  const save = useCallback(
    async (newStatus: ArticleStatus) => {
      setError(null);
      setSaving(true);
      try {
        const body = {
          title: title.trim(),
          slug: slug || slugFromTitle(title.trim()) || "articolo",
          excerpt: "",
          content,
          status: newStatus,
          category_slug: categorySlug.trim(),
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          image_url: imageUrl.trim() || null,
          image_alt: imageAlt.trim() || "",
          published_at:
            newStatus === "published" && publishedAt
              ? new Date(publishedAt).toISOString()
              : newStatus === "published"
                ? new Date().toISOString()
                : publishedAt
                  ? new Date(publishedAt).toISOString()
                  : null,
        };
        const url = articleId ? `/api/admin/articles/${articleId}` : "/api/admin/articles";
        const method = articleId ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Errore salvataggio");
        }
        const saved = await res.json();
        if (articleId) {
          router.push("/articoli");
        } else {
          router.push(`/articoli/${saved.id}/edit`);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore");
      } finally {
        setSaving(false);
      }
    },
    [articleId, title, slug, content, status, publishedAt, categorySlug, metaTitle, metaDescription, imageUrl, imageAlt, router]
  );

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    save("published");
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    save("draft");
  };

  const handleOpenMediaPicker = (mode: "inline" | "featured" = "inline") => {
    setMediaPickerMode(mode);
    setShowMediaPicker(true);
    if (mediaItems.length === 0) {
      void loadMedia(1, "");
    }
  };

  const handleSelectMedia = (item: MediaItem) => {
    if (mediaPickerMode === "featured") {
      setImageUrl(item.url_large || item.url_full);
      setImageAlt(item.path.split("/").pop() ?? "");
      setShowMediaPicker(false);
      return;
    }
    const url = item.url_large || item.url_full;
    editorRef.current?.insertImageFromUrl(url);
    setShowMediaPicker(false);
  };

  if (articleId && !loaded) {
    return (
      <div className="animate-pulse rounded-xl bg-white/5 border border-white/10 h-96" />
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}
      <div className="flex flex-col lg:flex-row gap-8 max-w-full">
      {/* Colonna principale: titolo + editor */}
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-white/80 mb-1">
            Titolo
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#f5a623] text-lg"
            placeholder="Titolo articolo"
          />
          {slug && (
            <p className="mt-1 text-xs text-white/50">
              URL: /{categorySlug ? `${categorySlug}/` : ""}{slug}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white/90">Corpo dell&apos;articolo</h2>
              <p className="text-xs text-white/50 mt-0.5">
                Testo formattato salvato come <strong className="text-white/70 font-medium">HTML</strong> (come sul sito). Barra in alto per titoli, grassetto, link e elenchi.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenMediaPicker("inline")}
              className="shrink-0 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-[#f5a623]/15 border border-[#f5a623]/35 text-sm text-[#f5d48a] hover:bg-[#f5a623]/25 transition-colors"
            >
              Immagine dalla libreria
            </button>
          </div>
          <div className="px-4 py-3 bg-[#1e1e1e]/80 border-b border-white/5">
            <p className="text-xs text-white/55 leading-relaxed">
              <span className="text-white/70 font-medium">Suggerimenti:</span> immagini da R2 con il pulsante a destra o trascinando il file nell&apos;area di scrittura; incolla da Word o browser mantenendo spesso la formattazione.
            </p>
          </div>
          <div className="p-1 sm:p-2 bg-[#252525] w-full">
            <ArticleHtmlEditor
              key={articleId ?? "new"}
              ref={editorRef}
              initialContent={initialEditorContent}
              onChange={setContent}
              minHeight="min(70vh, 560px)"
            />
          </div>
        </div>
      </div>

      {/* Sidebar destra: dati, stato, categoria, SEO, azioni */}
      <aside className="w-full lg:w-80 shrink-0 space-y-6">
        <div className="lg:sticky lg:top-6 space-y-6 rounded-xl bg-white/5 border border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white/90 uppercase tracking-wider">
            Pubblica
          </h3>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Data di pubblicazione
            </label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Stato
            </label>
            <div className="space-y-2">
              {(
                [
                  { value: "draft" as const, label: "Bozza" },
                  { value: "published" as const, label: "Pubblicato" },
                  { value: "private" as const, label: "Privato" },
                ] as const
              ).map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={status === value}
                    onChange={() => setStatus(value)}
                    className="rounded-full border-white/30 text-[#f5a623] focus:ring-[#f5a623]"
                  />
                  <span className="text-sm text-white/80">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Immagine in evidenza
            </label>
            {imageUrl ? (
              <div className="space-y-2">
                <div className="aspect-video rounded-lg border border-white/10 overflow-hidden bg-white/5">
                  <img
                    src={imageUrl}
                    alt={imageAlt || "In evidenza"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenMediaPicker("featured")}
                    className="flex-1 px-3 py-2 rounded-lg border border-white/20 text-white/80 text-sm hover:bg-white/10"
                  >
                    Cambia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl("");
                      setImageAlt("");
                    }}
                    className="px-3 py-2 rounded-lg border border-red-500/30 text-red-300 text-sm hover:bg-red-500/10"
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenMediaPicker("featured")}
                className="w-full py-6 rounded-lg border-2 border-dashed border-white/20 text-white/60 text-sm hover:border-[#f5a623]/50 hover:text-white/80 transition-colors"
              >
                Imposta immagine in evidenza
              </button>
            )}
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-white/80 mb-1">
              Categoria
            </label>
            <select
              id="category"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-medium text-white/80 mb-2">SEO</h4>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <label htmlFor="meta_title" className="block text-xs text-white/60">
                    Meta title
                  </label>
                  <span
                    className={`text-[10px] tabular-nums ${metaTitle.length > 60 ? "text-amber-400/90" : "text-white/40"}`}
                  >
                    {metaTitle.length}/60
                  </span>
                </div>
                <input
                  id="meta_title"
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
                  placeholder="Lascia vuoto per usare il titolo articolo"
                />
                <p className="text-[10px] text-white/35 mt-1">Circa 50–60 caratteri vanno bene nei risultati di ricerca.</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <label htmlFor="meta_description" className="block text-xs text-white/60">
                    Meta description
                  </label>
                  <span
                    className={`text-[10px] tabular-nums ${metaDescription.length > 160 ? "text-amber-400/90" : "text-white/40"}`}
                  >
                    {metaDescription.length}/160
                  </span>
                </div>
                <textarea
                  id="meta_description"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#f5a623] resize-y min-h-18"
                  placeholder="Breve riassunto che invita al clic nei risultati di ricerca"
                />
                <p className="text-[10px] text-white/35 mt-1">Circa 120–160 caratteri è l&apos;intervallo più usato.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="w-full px-4 py-3 rounded-lg bg-[#f5a623] text-[#1a1a1a] font-semibold hover:bg-[#e09520] disabled:opacity-50 transition-colors"
            >
              {saving ? "Salvataggio…" : "Pubblica"}
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="w-full px-4 py-2.5 rounded-lg border border-white/20 text-white/90 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              Salva bozza
            </button>
            <Link
              href="/articoli"
              className="text-center px-4 py-2.5 text-white/70 hover:text-white text-sm transition-colors"
            >
              Annulla
            </Link>
          </div>
        </div>
      </aside>
      </div>

      {/* Modal media picker full screen */}
      {showMediaPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowMediaPicker(false)}
        >
          <div
            className="bg-[#1f1f1f] border border-white/10 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                Scegli un&#39;immagine dalla libreria
              </h2>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-3 flex items-center justify-between gap-4 border-b border-white/10">
              <div className="flex items-center gap-3 text-xs text-white/70">
                <span>Libreria media</span>
                {mediaMonths.length > 0 && (
                  <select
                    value={mediaMonth}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMediaMonth(value);
                      void loadMedia(1, value);
                    }}
                    className="px-2 py-1 rounded bg-white/5 border border-white/15 text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-[#f5a623]"
                  >
                    <option value="">Tutti i mesi</option>
                    {mediaMonths.map((value) => (
                      <option key={value} value={value}>
                        {formatMonthLabel(value)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mediaError && (
                <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-200">
                  {mediaError}
                </div>
              )}
              {mediaLoading && mediaItems.length === 0 ? (
                <div className="text-center text-white/60 text-sm py-8">
                  Caricamento libreria…
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="text-center text-white/60 text-sm py-8">
                  Nessuna immagine disponibile.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {mediaItems.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMedia(m)}
                        className="group rounded border border-white/15 bg-white/5 overflow-hidden hover:border-[#f5a623]/60 transition-colors"
                      >
                        <div className="aspect-square bg-white/5 flex items-center justify-center p-1">
                          <img
                            src={m.url_thumb || m.url_small || m.url_full}
                            alt=""
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                  {mediaTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => void loadMedia(mediaPage - 1, mediaMonth)}
                        disabled={mediaPage <= 1 || mediaLoading}
                        className="px-3 py-1 rounded border border-white/20 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                      >
                        Precedente
                      </button>
                      <span className="text-xs text-white/70">
                        Pagina {mediaPage} di {mediaTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => void loadMedia(mediaPage + 1, mediaMonth)}
                        disabled={mediaPage >= mediaTotalPages || mediaLoading}
                        className="px-3 py-1 rounded border border-white/20 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                      >
                        Successiva
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
