"use client";

import Image from "next/image";
import TjLink from "@/components/TjLink";
import { useState, useRef, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { BLUR_DATA_URL } from "@/lib/constants";
import { fetchMegamenu as fetchMegamenuFromApi, type MegamenuPost } from "@/lib/tjApiClient";
import { useDialogFocus } from "./useDialogFocus";
// Sorgente unica: la stessa lista serve all'internal linking automatico per
// sapere quali archivi sono già raggiungibili da ogni pagina (vedi `lib/siteNav`).
import { NAV_ITEMS } from "@/lib/siteNav";
import SearchLauncher from "@/components/search/SearchLauncher";

export type { MegamenuPost };

interface NavBarProps {
  /** @deprecated I link alle categorie usano ora solo lo slug (es. /apple). */
  categoryLinks?: Record<string, string>;
  megamenuBySlug?: Record<string, MegamenuPost[]>;
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
}

const MEGAMENU_COLUMNS = 5;

function MegamenuPanel({
  label,
  categoryHref,
  categorySlug,
  posts,
  loading,
}: {
  label: string;
  categoryHref: string;
  categorySlug: string;
  posts: MegamenuPost[];
  loading?: boolean;
}) {
  const padded = [...posts];
  while (padded.length < MEGAMENU_COLUMNS) {
    padded.push({ slug: "", title: "", imageUrl: null, imageAlt: "" });
  }
  const slice = padded.slice(0, MEGAMENU_COLUMNS);

  if (loading) {
    return (
      <div className="bg-sidebar-bg border border-t-0 border-border shadow-xl py-4 px-4 rounded-b-md w-full animate-pulse">
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: MEGAMENU_COLUMNS }).map((_, i) => (
            <div key={i} className="flex flex-col min-w-0 rounded overflow-hidden">
              <div className="w-full aspect-4/3 rounded bg-content-bg/50" />
              <div className="h-12 mt-2 rounded bg-content-bg/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-sidebar-bg border border-t-0 border-border shadow-xl py-4 px-4 rounded-b-md w-full">
      <div className="grid grid-cols-5 gap-4">
        {slice.map((post, i) =>
          post.slug ? (
            <TjLink
              key={post.slug}
              href={`/${categorySlug}/${post.slug}`}
              className="flex flex-col min-w-0 rounded overflow-hidden hover:bg-surface-overlay group"
            >
              <div className="relative w-full aspect-4/3 rounded overflow-hidden bg-content-bg shrink-0">
                {post.imageUrl ? (
                  <Image
                    src={post.imageUrl}
                    alt={post.imageAlt}
                    fill
                    className="object-cover md:group-hover:scale-105 transition-transform"
                    sizes="200px"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                ) : (
                  <div className="absolute inset-0 bg-sidebar-bg" />
                )}
              </div>
              <span className="text-sm text-foreground group-hover:text-accent line-clamp-3 mt-2 px-1">
                {post.title}
              </span>
            </TjLink>
          ) : (
            <div key={`empty-${i}`} className="flex flex-col min-w-0 rounded overflow-hidden bg-content-bg/30 aspect-4/3" aria-hidden />
          )
        )}
      </div>
      <TjLink
        href={categoryHref}
        className="inline-block mt-3 px-4 py-2 text-sm font-medium text-accent hover:bg-surface-overlay rounded"
      >
        Tutti gli articoli {label}
      </TjLink>
    </div>
  );
}

export default function NavBar({ megamenuBySlug: initialMegamenu = {}, mobileMenuOpen: controlledOpen, setMobileMenuOpen: setControlledOpen }: NavBarProps) {
  const pathname = usePathname();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [megamenuBySlug, setMegamenuBySlug] = useState<Record<string, MegamenuPost[]>>(initialMegamenu);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const loadingSlugsRef = useRef<Set<string>>(new Set());
  const loadedSlugsRef = useRef<Set<string>>(new Set());

  const mobileMenuOpen = setControlledOpen !== undefined ? (controlledOpen ?? false) : internalOpen;
  const setMobileMenuOpen = setControlledOpen ?? setInternalOpen;
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [setMobileMenuOpen]);
  const mobileDialogRef = useDialogFocus<HTMLDivElement>(mobileMenuOpen, closeMobileMenu);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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

  const fetchMegamenu = useCallback(async (slug: string) => {
    if (loadedSlugsRef.current.has(slug) || loadingSlugsRef.current.has(slug)) return;
    loadingSlugsRef.current.add(slug);
    setLoadingSlug(slug);
    try {
      // fetchMegamenuFromApi non lancia su HTTP non-ok (es. 503): ritorna [].
      const posts = await fetchMegamenuFromApi(slug);
      // Lista vuota = possibile errore upstream: non marcare come caricato,
      // così il prossimo hover ritenta invece di restare vuoto per sempre.
      if (posts.length > 0) {
        loadedSlugsRef.current.add(slug);
      }
      setMegamenuBySlug((prev) => ({ ...prev, [slug]: posts }));
    } finally {
      loadingSlugsRef.current.delete(slug);
      setLoadingSlug((prev) => (prev === slug ? null : prev));
    }
  }, []);

  const handleEnter = useCallback((slug: string) => {
    clearCloseTimeout();
    setActiveSlug(slug);
    fetchMegamenu(slug);
  }, [clearCloseTimeout, fetchMegamenu]);

  const handleLeave = useCallback(() => {
    scheduleClose();
  }, [scheduleClose]);

  const handleHomeLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname !== "/") return;
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [pathname],
  );

  return (
    <>
      <div
        className="relative"
        onMouseLeave={handleLeave}
      >
        {/* Nav desktop: nascosto su mobile */}
        <nav className="hidden md:flex items-center gap-6 py-3 border-t border-border flex-wrap">
          {NAV_ITEMS.map((item) => {
            const isDropdown = "slug" in item;

            if (isDropdown) {
              const slug = item.slug;
              const categoryHref = `/${slug}`;

              return (
                <TjLink
                  key={slug}
                  href={categoryHref}
                  className="text-foreground hover:text-accent transition-colors text-base font-medium flex items-center gap-0.5 py-1"
                  onMouseEnter={() => slug != null && handleEnter(slug)}
                  onFocus={() => slug != null && handleEnter(slug)}
                  aria-expanded={activeSlug === slug}
                  /* `aria-controls` solo a pannello aperto: il megamenu esiste
                     nel DOM unicamente quando `activeSlug` coincide, e un
                     riferimento a un elemento assente è un attributo rotto —
                     compariva su ogni pagina del sito, tre volte. */
                  aria-controls={activeSlug === slug ? `megamenu-${slug}` : undefined}
                >
                  {item.label}
                  <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </TjLink>
              );
            }

            return (
              <TjLink
                key={item.href}
                href={item.href}
                className="text-foreground hover:text-accent transition-colors text-base font-medium py-1"
                onClick={item.href === "/" ? handleHomeLinkClick : undefined}
              >
                {item.label}
              </TjLink>
            );
          })}
          {/* Ricerca globale: apre la tendina ⌘K invece di portare a /search.
              La pagina resta raggiungibile — dal menu mobile e dal fondo della
              tendina stessa — perché è indicizzabile, condivisibile e funziona
              senza JavaScript. */}
          <SearchLauncher className="ml-auto p-1 text-foreground transition-colors hover:text-accent" />
        </nav>

        {/* Megamenu fisso sotto la barra: stessa posizione per tutte le voci */}
        {activeSlug && (() => {
          const item = NAV_ITEMS.find((i) => "slug" in i && i.slug === activeSlug);
          const categoryHref = `/${activeSlug}`;
          const posts = megamenuBySlug[activeSlug] ?? [];
          const label = item && "label" in item ? item.label : activeSlug;
          return (
            <div
              id={`megamenu-${activeSlug}`}
              className="absolute top-full left-0 right-0 z-50 pt-0"
              onMouseEnter={handleEnter.bind(null, activeSlug)}
            >
              <MegamenuPanel label={label} categoryHref={categoryHref} categorySlug={activeSlug} posts={posts} loading={loadingSlug === activeSlug} />
            </div>
          );
        })()}
      </div>

      {/* Popup menu a tutto schermo (mobile) */}
      {mobileMenuOpen && (
        <div
          ref={mobileDialogRef}
          className="fixed inset-0 z-100 bg-background flex flex-col md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu di navigazione"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="text-foreground font-semibold">Menu</span>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="p-2 text-foreground hover:text-accent transition-colors rounded-lg hover:bg-surface-overlay"
              aria-label="Chiudi menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 overflow-auto py-6 px-4">
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                // Il tipo `NavItem` è un'unione: una voce ha `href` **oppure**
                // `slug`, mai entrambi. Il ripiego su "/" del codice precedente
                // era irraggiungibile.
                const href = "href" in item ? item.href : `/${item.slug}`;
                return (
                  <li key={href}>
                    <TjLink
                      href={href}
                      className="block py-3 px-4 text-foreground hover:text-accent hover:bg-surface-overlay rounded-lg transition-colors text-lg font-medium"
                      onClick={(event) => {
                        if (href === "/") handleHomeLinkClick(event);
                        closeMobileMenu();
                      }}
                    >
                      {item.label}
                    </TjLink>
                  </li>
                );
              })}
              <li className="border-t border-border mt-2 pt-2">
                <TjLink
                  href="/search"
                  className="block py-3 px-4 text-foreground hover:text-accent hover:bg-surface-overlay rounded-lg transition-colors text-lg font-medium"
                  onClick={closeMobileMenu}
                >
                  Cerca
                </TjLink>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
