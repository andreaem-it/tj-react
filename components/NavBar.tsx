"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useCallback } from "react";

const NAV_ITEMS = [
  { label: "Ultime Notizie", href: "/" },
  { label: "Apple", slug: "apple" },
  { label: "Apps", slug: "apps" },
  { label: "Tech", slug: "tech" },
  { label: "Gaming", slug: "gaming" },
  { label: "Smart Home", slug: "smart-home" },
  { label: "IA", slug: "ia" },
  { label: "Offerte", slug: "offerte" },
];

export interface MegamenuPost {
  slug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
}

interface NavBarProps {
  /** @deprecated I link alle categorie usano ora solo lo slug (es. /apple). */
  categoryLinks?: Record<string, string>;
  megamenuBySlug?: Record<string, MegamenuPost[]>;
}

const MEGAMENU_COLUMNS = 5;

function MegamenuPanel({
  label,
  categoryHref,
  posts,
}: {
  label: string;
  categoryHref: string;
  posts: MegamenuPost[];
}) {
  const padded = [...posts];
  while (padded.length < MEGAMENU_COLUMNS) {
    padded.push({ slug: "", title: "", imageUrl: null, imageAlt: "" });
  }
  const slice = padded.slice(0, MEGAMENU_COLUMNS);

  return (
    <div className="bg-sidebar-bg border border-t-0 border-white/10 shadow-xl py-4 px-4 rounded-b-md w-full">
      <div className="grid grid-cols-5 gap-4">
        {slice.map((post, i) =>
          post.slug ? (
            <Link
              key={post.slug}
              href={`/${post.slug}`}
              className="flex flex-col min-w-0 rounded overflow-hidden hover:bg-white/5 group"
            >
              <div className="relative w-full aspect-4/3 rounded overflow-hidden bg-content-bg shrink-0">
                {post.imageUrl ? (
                  <Image
                    src={post.imageUrl}
                    alt={post.imageAlt}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                    sizes="200px"
                  />
                ) : (
                  <div className="absolute inset-0 bg-sidebar-bg" />
                )}
              </div>
              <span className="text-sm text-white group-hover:text-accent line-clamp-3 mt-2 px-1">
                {post.title}
              </span>
            </Link>
          ) : (
            <div key={`empty-${i}`} className="flex flex-col min-w-0 rounded overflow-hidden bg-content-bg/30 aspect-4/3" aria-hidden />
          )
        )}
      </div>
      <Link
        href={categoryHref}
        className="inline-block mt-3 px-4 py-2 text-sm font-medium text-accent hover:bg-white/5 rounded"
      >
        Tutti gli articoli {label}
      </Link>
    </div>
  );
}

export default function NavBar({ megamenuBySlug = {} }: NavBarProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => setActiveSlug(null), 120);
  }, [clearCloseTimeout]);

  const handleEnter = useCallback((slug: string) => {
    clearCloseTimeout();
    setActiveSlug(slug);
  }, [clearCloseTimeout]);

  const handleLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  return (
    <div
      className="relative"
      onMouseLeave={handleLeave}
    >
      <nav className="flex items-center gap-6 py-3 border-t border-white/10 flex-wrap">
        {NAV_ITEMS.map((item) => {
          const href =
            "href" in item ? item.href : `/${item.slug}`;
          const isDropdown = "slug" in item;

          if (isDropdown) {
            const slug = item.slug;
            const categoryHref = `/${slug}`;

            return (
              <Link
                key={slug}
                href={categoryHref}
                className="text-white hover:text-accent transition-colors text-sm font-medium flex items-center gap-0.5 py-1"
                onMouseEnter={() => handleEnter(slug)}
              >
                {item.label}
                <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="text-white hover:text-accent transition-colors text-sm font-medium py-1"
            >
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/search"
          className="ml-auto text-white hover:text-accent transition-colors p-1"
          aria-label="Cerca"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </Link>
      </nav>

      {/* Megamenu fisso sotto la barra: stessa posizione per tutte le voci */}
      {activeSlug && (() => {
        const item = NAV_ITEMS.find((i) => "slug" in i && i.slug === activeSlug);
        const categoryHref = `/${activeSlug}`;
        const posts = megamenuBySlug[activeSlug] ?? [];
        const label = item && "label" in item ? item.label : activeSlug;
        return (
          <div
            className="absolute top-full left-0 right-0 z-50 pt-0"
            onMouseEnter={handleEnter.bind(null, activeSlug)}
          >
            <MegamenuPanel label={label} categoryHref={categoryHref} posts={posts} />
          </div>
        );
      })()}
    </div>
  );
}
