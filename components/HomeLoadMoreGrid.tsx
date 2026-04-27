"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PostsGrid from "./PostsGrid";
import InlineBannerPlaceholder from "./InlineBannerPlaceholder";
import type { PostWithMeta } from "@/lib/api";
import { fetchPosts } from "@/lib/tjApiClient";

interface HomeLoadMoreGridProps {
  /** Compatibilità retro: alcuni callsite passano ancora i post iniziali SSR. */
  initialPosts?: PostWithMeta[];
  initialTotalPages: number;
  initialPagesConsumed: number;
  categoryId?: number;
  emptyGridIsExpected: boolean;
}

export default function HomeLoadMoreGrid(props: HomeLoadMoreGridProps) {
  const { initialPosts = [], initialTotalPages, initialPagesConsumed, categoryId, emptyGridIsExpected } = props;
  const [gridPosts, setGridPosts] = useState<PostWithMeta[]>(initialPosts);
  const [hasMore, setHasMore] = useState(
    initialPagesConsumed < initialTotalPages || initialPosts.length >= 8
  );
  const [isLoading, setIsLoading] = useState(false);
  const nextPageRef = useRef(initialPagesConsumed + 1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadNextPage = useCallback(async () => {
    if (isLoading || !hasMore) return;
    const pageToFetch = nextPageRef.current;
    setIsLoading(true);
    try {
      const data = await fetchPosts(pageToFetch, categoryId);
      if (data.posts?.length) {
        setGridPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPosts = data.posts.filter((p: PostWithMeta) => !existingIds.has(p.id));
          return newPosts.length > 0 ? [...prev, ...newPosts] : prev;
        });
        nextPageRef.current = pageToFetch + 1;
        setHasMore(pageToFetch < (data.totalPages ?? 1));
      } else {
        setHasMore(false);
      }
    } catch {
      // Errore transitorio: lasciamo possibile il retry manuale.
    } finally {
      setIsLoading(false);
    }
  }, [categoryId, hasMore, isLoading]);

  const onLoadMore = useCallback(() => {
    void loadNextPage();
  }, [loadNextPage]);

  // Infinite scroll: carica automaticamente quando il fondo entra in viewport.
  useEffect(() => {
    if (!hasMore || isLoading) return;
    const node = sentinelRef.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            void loadNextPage();
            break;
          }
        }
      },
      { rootMargin: "500px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadNextPage, gridPosts.length]);

  // Se la griglia è dispari e ci sono altre pagine, prova a bilanciare automaticamente.
  useEffect(() => {
    if (isLoading || !hasMore) return;
    if (gridPosts.length > 0 && gridPosts.length % 2 !== 0) {
      void loadNextPage();
    }
  }, [gridPosts.length, hasMore, isLoading, loadNextPage]);

  return (
    <>
      <InlineBannerPlaceholder
        width="100%"
        height={90}
        className="mb-6"
        adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP}
      />
      <PostsGrid
        posts={gridPosts}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        isLoading={isLoading}
        emptyGridIsExpected={emptyGridIsExpected}
      />
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
    </>
  );
}
