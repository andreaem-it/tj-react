"use client";

import { useState } from "react";
import ArticleCard from "./ArticleCard";
import type { PostListItem } from "@/lib/api";

const PER_SLIDE = 3;

interface RelatedArticlesSliderProps {
  /** Intestazione della sezione; il valore predefinito promette pertinenza. */
  heading?: string;
  posts: PostListItem[];
}

export default function RelatedArticlesSlider({ posts, heading }: RelatedArticlesSliderProps) {
  const totalSlides = Math.ceil(posts.length / PER_SLIDE) || 1;
  const [currentSlide, setCurrentSlide] = useState(0);

  const start = currentSlide * PER_SLIDE;
  const visible = posts.slice(start, start + PER_SLIDE);
  const canPrev = currentSlide > 0;
  const canNext = currentSlide < totalSlides - 1;

  return (
    <section className="mt-8 pt-6 border-t border-border">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-foreground text-lg font-semibold">
          {heading ?? "Articoli correlati"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
            disabled={!canPrev}
            className="w-11 h-11 rounded-lg border border-border bg-surface-overlay text-foreground hover:bg-surface-overlay-strong disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Articoli precedenti"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-muted text-sm tabular-nums min-w-[4ch] text-center">
            {currentSlide + 1}/{totalSlides}
          </span>
          <button
            type="button"
            onClick={() => setCurrentSlide((s) => Math.min(totalSlides - 1, s + 1))}
            disabled={!canNext}
            className="w-11 h-11 rounded-lg border border-border bg-surface-overlay text-foreground hover:bg-surface-overlay-strong disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Articoli successivi"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visible.map((post) => (
          <ArticleCard key={post.id} post={post} />
        ))}
      </div>
      {totalSlides > 1 && (
        <div className="flex justify-center mt-4">
          {Array.from({ length: totalSlides }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSlide(i)}
              className="w-11 h-11 rounded-full flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label={`Vai al gruppo ${i + 1}`}
              aria-current={i === currentSlide ? "true" : undefined}
            >
              <span
                aria-hidden="true"
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentSlide
                    ? "bg-accent"
                    : "bg-surface-overlay group-hover:bg-surface-overlay-strong"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
