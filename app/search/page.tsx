import Link from "next/link";
import type { Metadata } from "next";
import { fetchSearchPosts } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import SearchForm from "@/components/SearchForm";
import TjLink from "@/components/TjLink";
import { rankResults, searchEntries, tokenize } from "@/lib/search/match";
import { buildLocalIndex } from "@/lib/search/sources";
import {
  SEARCH_KIND_LABEL,
  SEARCH_KIND_ORDER,
  type SearchResult,
  type SearchResultKind,
} from "@/lib/search/types";

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.techjournal.it";
const searchCanonical = `${siteUrl.replace(/\/$/, "")}/search`;

export const metadata: Metadata = {
  title: "Cerca articoli - Apple, Tech e Gadget",
  description: "Cerca articoli e notizie su Apple, iPhone, Mac, tech e gadget su TechJournal.",
  robots: { index: false, follow: true },
  alternates: { canonical: searchCanonical },
  openGraph: {
    title: "Cerca articoli | TechJournal",
    description: "Cerca articoli e notizie su Apple, tech e gadget su TechJournal.",
    url: searchCanonical,
    siteName: "TechJournal",
    type: "website",
  },
  twitter: { card: "summary", title: "Cerca | TechJournal", description: "Cerca articoli TechJournal." },
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

/** Risultati non-articolo per gruppo: la pagina ha spazio, la tendina no. */
const LIMIT_PER_KIND = 8;

/**
 * Pagina di ricerca.
 *
 * Cerca fra gli stessi quattro archivi della tendina ⌘K, ma **interamente lato
 * server**: funziona senza JavaScript, si può condividere via URL e resta
 * l'approdo per chi arriva dal menu mobile. Prima interrogava i soli articoli, e
 * chi cercava "iPhone 12" non trovava la scheda del dispositivo pur essendo in
 * archivio.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: query = "", page: pageParam = "1" } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1);
  const perPage = 12;
  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const [{ posts, totalPages }, localIndex] = await Promise.all([
    hasQuery
      ? fetchSearchPosts({ query: trimmed, page, perPage })
      : Promise.resolve({ posts: [], totalPages: 0 }),
    hasQuery ? buildLocalIndex().catch(() => []) : Promise.resolve([]),
  ]);

  const tokens = tokenize(trimmed);
  const scored = searchEntries(tokens, localIndex);
  const byKind = new Map<SearchResultKind, SearchResult[]>();
  for (const result of scored) {
    const bucket = byKind.get(result.kind);
    if (bucket) bucket.push(result);
    else byKind.set(result.kind, [result]);
  }

  // Le altre pagine dell'elenco articoli mostrano solo articoli: ripetere in
  // testa le stesse schede a ogni pagina sarebbe rumore.
  const groups =
    page === 1
      ? SEARCH_KIND_ORDER.filter((kind) => kind !== "article")
          .map((kind) => ({
            kind,
            label: SEARCH_KIND_LABEL[kind],
            results: rankResults(byKind.get(kind) ?? [], LIMIT_PER_KIND),
          }))
          .filter((group) => group.results.length > 0)
          .sort((a, b) => b.results[0].score - a.results[0].score)
      : [];

  const hasMore = page < totalPages;

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-0 py-8 md:px-4">
      <div className="mb-8">
        <h1 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">Cerca</h1>
        <SearchForm defaultQuery={query} />
      </div>

      {!hasQuery ? (
        <p className="text-muted">
          Cerca fra articoli, argomenti, schede di compatibilità e prezzi monitorati. Da tastiera:{" "}
          <kbd className="rounded border border-border px-1.5 py-0.5 text-xs">⌘K</kbd>.
        </p>
      ) : (
        <>
          {groups.length > 0 && (
            <div className="mb-10 flex flex-col gap-6">
              {groups.map((group) => (
                <section key={group.kind} aria-labelledby={`search-${group.kind}`}>
                  <h2
                    id={`search-${group.kind}`}
                    className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted"
                  >
                    {group.label}
                  </h2>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {group.results.map((result) => (
                      <li key={`${result.kind}-${result.id}`}>
                        <TjLink
                          href={result.href}
                          className="flex items-baseline justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-overlay"
                        >
                          <span className="min-w-0">
                            <span className="block font-semibold text-foreground">
                              {result.title}
                            </span>
                            {result.subtitle && (
                              <span className="mt-0.5 block text-sm text-muted">
                                {result.subtitle}
                              </span>
                            )}
                          </span>
                          {result.badge && (
                            <span className="shrink-0 text-sm text-muted">{result.badge}</span>
                          )}
                        </TjLink>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
            {SEARCH_KIND_LABEL.article}
          </h2>
          {posts.length === 0 ? (
            <p className="py-4 text-muted">
              {groups.length > 0
                ? "Nessun articolo per questa ricerca."
                : `Nessun risultato per "${trimmed}".`}{" "}
              <Link href="/" className="text-accent hover:underline">
                Torna alla home
              </Link>
              .
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
                {posts.map((post) => (
                  <ArticleCard key={post.id} post={post} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Link
                    href={`/search?q=${encodeURIComponent(trimmed)}&page=${page + 1}`}
                    className="rounded bg-accent px-6 py-3 font-semibold text-gray-900 transition-opacity hover:opacity-90"
                  >
                    Altri risultati
                  </Link>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
