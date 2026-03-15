import Link from "next/link";
import type { Metadata } from "next";
import { fetchSearchPosts } from "@/lib/api";
import ArticleCard from "@/components/ArticleCard";
import SearchForm from "@/components/SearchForm";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Cerca",
  description: "Cerca articoli su TechJournal.",
  robots: { index: false, follow: true },
};

interface SearchPageProps {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: query = "", page: pageParam = "1" } = await searchParams;
  const page = Math.max(1, parseInt(String(pageParam), 10) || 1);
  const perPage = 12;

  const { posts, totalPages } = query.trim()
    ? await fetchSearchPosts({ query: query.trim(), page, perPage })
    : { posts: [], totalPages: 0 };

  const hasMore = page < totalPages;
  const hasQuery = query.trim().length > 0;

  return (
    <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-8">
      <div className="mb-8">
        <h1 className="text-foreground text-2xl md:text-3xl font-bold mb-4">Cerca articoli</h1>
        <SearchForm defaultQuery={query} />
      </div>

      {!hasQuery ? (
        <p className="text-muted">Inserisci una parola chiave e premi Cerca.</p>
      ) : (
        <>
          <p className="text-muted text-sm mb-6">
            {posts.length === 0
              ? `Nessun risultato per "${query.trim()}".`
              : `Risultati per "${query.trim()}" (${posts.length}${totalPages > 1 ? ` di più pagine` : ""}).`}
          </p>

          {posts.length === 0 ? (
            <p className="text-muted py-8">Prova con altri termini o torna alla <Link href="/" className="text-accent hover:underline">home</Link>.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {posts.map((post) => (
                  <ArticleCard key={post.id} post={post} />
                ))}
              </div>
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Link
                    href={`/search?q=${encodeURIComponent(query.trim())}&page=${page + 1}`}
                    className="px-6 py-3 bg-accent text-gray-900 font-semibold rounded hover:opacity-90 transition-opacity"
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
