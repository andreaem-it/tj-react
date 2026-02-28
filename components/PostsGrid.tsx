"use client";

import ArticleCard from "./ArticleCard";
import type { PostWithMeta } from "@/lib/api";

interface PostsGridProps {
  posts: PostWithMeta[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading?: boolean;
  /** Se true, la griglia può essere vuota perché tutti i post sono in hero (es. categoria con 3 articoli). */
  emptyGridIsExpected?: boolean;
}

export default function PostsGrid({ posts, hasMore, onLoadMore, isLoading, emptyGridIsExpected }: PostsGridProps) {
  if (posts.length === 0) {
    if (!hasMore && !emptyGridIsExpected) {
      return (
        <p className="text-muted py-8 text-center">Nessun articolo trovato.</p>
      );
    }
    return null;
  }

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {posts.map((post) => (
          <ArticleCard key={post.id} post={post} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoading}
            className="px-6 py-3 bg-accent text-white font-semibold rounded hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {isLoading ? "Caricamento..." : "More Posts"}
          </button>
        </div>
      )}
    </section>
  );
}
