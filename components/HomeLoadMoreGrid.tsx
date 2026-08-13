"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PostsGrid from "./PostsGrid";
import InlineBannerPlaceholder from "./InlineBannerPlaceholder";
import type { PostWithMeta } from "@/lib/api";
import { fetchPosts } from "@/lib/tjApiClient";

/**
 * Dimensione pagina di `/api/posts/:page` su tj-api. Il parametro `per_page` in
 * query viene ignorato dall'endpoint (verificato: per_page=20 restituisce
 * comunque 10 elementi), quindi il client deve conoscerla per calcolare da dove
 * ripartire.
 *
 * Serve perché le due API paginano in modo diverso: `tj/v1/home` restituisce 20
 * post dichiarando `pagesConsumed: 1`, mentre `/posts` pagina a 10. Ripartire
 * dalla "pagina 2" significava richiedere i post 11–20, già tutti a schermo:
 * il filtro anti-duplicati li scartava e la paginazione si spegneva al primo
 * tentativo.
 */
const SERVER_PAGE_SIZE = 10;

/** Pagine consecutive di soli duplicati tollerate prima di considerare esaurito l'archivio. */
const MAX_DUPLICATE_PAGES = 3;

interface HomeLoadMoreGridProps {
  /** Compatibilità retro: alcuni callsite passano ancora i post iniziali SSR. */
  initialPosts?: PostWithMeta[];
  /**
   * Tutti i post già consumati dall'API per il render iniziale, hero compresi.
   * La griglia ne mostra solo una parte (`HomeContent` ne assegna i primi
   * all'hero), ma senza il totale calcolerebbe una pagina di ripresa
   * sbagliata e richiederebbe contenuti già a schermo. Default: `initialPosts`.
   */
  initialConsumedPosts?: PostWithMeta[];
  initialTotalPages: number;
  initialPagesConsumed: number;
  categoryId?: number;
  emptyGridIsExpected: boolean;
}

export default function HomeLoadMoreGrid(props: HomeLoadMoreGridProps) {
  const {
    initialPosts = [],
    initialConsumedPosts,
    initialTotalPages,
    initialPagesConsumed,
    categoryId,
    emptyGridIsExpected,
  } = props;
  const consumedPosts = initialConsumedPosts ?? initialPosts;
  const [gridPosts, setGridPosts] = useState<PostWithMeta[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialPagesConsumed < initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // La prima pagina utile si deduce da quanti post sono già a schermo, non da
  // `initialPagesConsumed`: quel contatore è espresso nella paginazione di
  // `tj/v1/home` (pagine da 20), incompatibile con quella di `/posts` (da 10).
  const nextPageRef = useRef(
    Math.max(initialPagesConsumed, Math.floor(consumedPosts.length / SERVER_PAGE_SIZE)) + 1,
  );
  /** Pagine consecutive che non hanno portato nulla di nuovo. */
  const duplicatePagesRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Mutex sincrono: lo state isLoading è asincrono e non previene trigger
  // simultanei (infinite scroll + click "Load more" nello stesso tick).
  const loadingRef = useRef(false);
  // ID già in griglia, aggiornato in modo sincrono per rilevare pagine di soli duplicati.
  // Seed con TUTTI i post già a schermo (hero incluso): altrimenti un articolo
  // dell'hero potrebbe ricomparire nella griglia come duplicato visibile.
  const seenIdsRef = useRef<Set<number>>(new Set(consumedPosts.map((p) => p.id)));

  const loadNextPage = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    const pageToFetch = nextPageRef.current;
    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await fetchPosts(pageToFetch, categoryId);
      if (data.posts?.length) {
        const newPosts = data.posts.filter(
          (p: PostWithMeta) => !seenIdsRef.current.has(p.id)
        );
        const totalPages = data.totalPages ?? 1;
        if (newPosts.length === 0) {
          // Solo duplicati: può capitare per un disallineamento fra la
          // paginazione del render iniziale e quella di `/posts`. Si avanza di
          // una pagina invece di fermarsi subito, così un offset sbagliato si
          // corregge da solo; il contatore evita il fetch in loop.
          duplicatePagesRef.current += 1;
          nextPageRef.current = pageToFetch + 1;
          if (duplicatePagesRef.current >= MAX_DUPLICATE_PAGES || pageToFetch >= totalPages) {
            setHasMore(false);
          }
          return;
        }
        duplicatePagesRef.current = 0;
        for (const p of newPosts) seenIdsRef.current.add(p.id);
        setGridPosts((prev) => [...prev, ...newPosts]);
        nextPageRef.current = pageToFetch + 1;
        setHasMore(pageToFetch < totalPages);
      } else {
        setHasMore(false);
      }
    } catch {
      setLoadError(true);
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
        loadError={loadError}
        emptyGridIsExpected={emptyGridIsExpected}
      />
      <div ref={sentinelRef} className="h-px w-full" aria-hidden />
    </>
  );
}
