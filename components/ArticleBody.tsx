"use client";

import { useState, useEffect, useMemo } from "react";
import { API_BASE, API_REQUEST_HEADERS, WP_BASE, logApiUrl } from "@/lib/constants";
import { sanitizeRichHtml } from "@/lib/sanitizeRichHtml";

const STORAGE_KEY = "article-font-size";
const MIN_LEVEL = 0;
const MAX_LEVEL = 2;

const API_ORIGIN = (() => {
  try {
    return new URL(WP_BASE).origin;
  } catch {
    return API_BASE.replace(/\/$/, "");
  }
})();

interface ArticleBodyProps {
  html: string;
  viewCount?: number | null;
  postId?: number;
}

export default function ArticleBody({ html, viewCount: viewCountProp, postId }: ArticleBodyProps) {
  const [level, setLevel] = useState(1);
  const [viewCountFetched, setViewCountFetched] = useState<number | null>(null);
  const viewCount = viewCountProp ?? viewCountFetched;
  const safeHtml = useMemo(() => sanitizeRichHtml(html), [html]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const n = parseInt(stored, 10);
        if (n >= MIN_LEVEL && n <= MAX_LEVEL) setLevel(n);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (viewCountProp != null || !postId) return;
    const ctrl = new AbortController();
    const tryFetch = async (url: string) => {
      logApiUrl(url);
      try {
        const res = await fetch(url, { signal: ctrl.signal, headers: API_REQUEST_HEADERS });
        if (!res.ok) return null;
        const data = await res.json();
        const n = typeof data?.views === "number" ? data.views : typeof data?.count === "number" ? data.count : Number(data?.post_views);
        return Number.isFinite(n) && n >= 0 ? n : null;
      } catch {
        return null;
      }
    };
    (async () => {
      const n =
        (await tryFetch(`${WP_BASE}/views/${postId}`)) ??
        (await tryFetch(`${API_ORIGIN}/wp-json/pvc/v1/posts/${postId}`)) ??
        (await tryFetch(`${API_ORIGIN}/wp-json/post-views-counter/v1/views/${postId}`));
      if (n != null) setViewCountFetched(n);
    })();
    return () => ctrl.abort();
  }, [postId, viewCountProp]);

  const persist = (value: number) => {
    setLevel(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  };

  const smaller = () => persist(Math.max(MIN_LEVEL, level - 1));
  const larger = () => persist(Math.min(MAX_LEVEL, level + 1));

  return (
    <div className="article-body-wrapper" data-font-size={level}>
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 text-muted text-sm" title="Numero di letture dell’articolo">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span aria-label="Visualizzazioni">
            {viewCount != null ? viewCount.toLocaleString("it-IT") : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted text-sm mr-1">Testo:</span>
          <button
            type="button"
            onClick={smaller}
            disabled={level === MIN_LEVEL}
            className="w-8 h-8 rounded border border-border bg-surface-overlay text-foreground hover:bg-surface-overlay-strong disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors"
            aria-label="Riduci dimensione testo"
          >
            A−
          </button>
          <button
            type="button"
            onClick={larger}
            disabled={level === MAX_LEVEL}
            className="w-8 h-8 rounded border border-border bg-surface-overlay text-foreground hover:bg-surface-overlay-strong disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold transition-colors"
            aria-label="Aumenta dimensione testo"
          >
            A+
          </button>
        </div>
      </div>
      <div
        className="article-content"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </div>
  );
}
