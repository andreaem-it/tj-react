"use client";

import { useState } from "react";
import ArticleCard from "./ArticleCard";
import type { PostWithMeta } from "@/lib/api";

const PER_SLIDE = 3;

interface RelatedArticlesSliderProps {
  posts: PostWithMeta[];
}

export default function RelatedArticlesSlider({ posts }: RelatedArticlesSliderProps) {
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
          Articoli correlati
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
            disabled={!canPrev}
            className="w-9 h-9 rounded-lg border border-border bg-surface-overlay text-foreground hover:bg-surface-overlay-strong disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            aria-label="Articoli precedenti"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="w-9 h-9 rounded-lg border border-border bg-surface-overlay text-foreground hover:bg-surface-overlay-strong disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            aria-label="Articoli successivi"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="flex justify-center gap-1.5 mt-4">
          {Array.from({ length: totalSlides }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentSlide ? "bg-accent" : "bg-surface-overlay hover:bg-surface-overlay-strong"
              }`}
              aria-label={`Vai al gruppo ${i + 1}`}
              aria-current={i === currentSlide ? "true" : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
