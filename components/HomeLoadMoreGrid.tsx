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
  const [hasMore, setHasMore] = useState(initialPagesConsumed < initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const nextPageRef = useRef(initialPagesConsumed + 1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Mutex sincrono: lo state isLoading è asincrono e non previene trigger
  // simultanei (infinite scroll + click "Load more" nello stesso tick).
  const loadingRef = useRef(false);
  // ID già in griglia, aggiornato in modo sincrono per rilevare pagine di soli duplicati.
  const seenIdsRef = useRef<Set<number>>(new Set(initialPosts.map((p) => p.id)));

  const loadNextPage = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    const pageToFetch = nextPageRef.current;
    setIsLoading(true);
    try {
      const data = await fetchPosts(pageToFetch, categoryId);
      if (data.posts?.length) {
        const newPosts = data.posts.filter(
          (p: PostWithMeta) => !seenIdsRef.current.has(p.id)
        );
        if (newPosts.length === 0) {
          // Solo duplicati: la API non ha più contenuti nuovi da offrire,
          // fermiamo la paginazione per evitare fetch in loop.
          setHasMore(false);
          return;
        }
        for (const p of newPosts) seenIdsRef.current.add(p.id);
        setGridPosts((prev) => [...prev, ...newPosts]);
        nextPageRef.current = pageToFetch + 1;
        setHasMore(pageToFetch < (data.totalPages ?? 1));
      } else {
        setHasMore(false);
      }
    } catch {
      // Errore transitorio: lasciamo possibile il retry manuale.
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [categoryId, hasMore]);

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
        adFormat="horizontal"
        fullWidthResponsive={false}
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
