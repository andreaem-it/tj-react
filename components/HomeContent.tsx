"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import HeroSection from "./HeroSection";
import PostsGrid from "./PostsGrid";
import OfferteSidebar from "./OfferteSidebar";
import TrendingSidebar from "./TrendingSidebar";
import MostReadSidebar from "./MostReadSidebar";
import TrendingByPeriodSidebar from "./TrendingByPeriodSidebar";
import InlineBannerPlaceholder from "./InlineBannerPlaceholder";
import type { PostWithMeta } from "@/lib/api";
import { fetchPosts, fetchSocialStats } from "@/lib/tjApiClient";

const PER_PAGE = 10;

interface HomeContentProps {
  initialPosts: PostWithMeta[];
  initialTotalPages: number;
  /** Pagine già caricate lato server (per "Load more" senza duplicati). */
  initialPagesConsumed?: number;
  offertePosts: PostWithMeta[];
  trendingPosts: PostWithMeta[];
  mostReadPosts: PostWithMeta[];
  weekTrendingPosts: PostWithMeta[];
  monthTrendingPosts: PostWithMeta[];
  categoryId?: number;
}

export default function HomeContent({
  initialPosts,
  initialTotalPages,
  initialPagesConsumed = 1,
  offertePosts,
  trendingPosts,
  mostReadPosts,
  weekTrendingPosts,
  monthTrendingPosts,
  categoryId,
}: HomeContentProps) {
  const heroPosts = initialPosts.slice(0, 4);
  const [gridPosts, setGridPosts] = useState<PostWithMeta[]>(initialPosts.slice(4));
  const [hasMore, setHasMore] = useState(initialPagesConsumed < initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  /** Prossima pagina da richiedere: il server ha già inviato initialPagesConsumed pagine da 10, quindi la prossima è initialPagesConsumed + 1. */
  const nextPageRef = useRef(initialPagesConsumed + 1);

  const [socialStats, setSocialStats] = useState<{
    facebook: number | null;
    instagram: number | null;
  }>({ facebook: null, instagram: null });

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      fetchSocialStats({ refresh: true })
        .then((data) => {
          if (cancelled || !data) return;
          setSocialStats({
            facebook: data.facebook?.followers ?? null,
            instagram: data.instagram?.followers ?? null,
          });
        })
        .catch(() => {});
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (
        window as Window & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(run, { timeout: 3000 });
      return () => {
        cancelled = true;
        if ("cancelIdleCallback" in window) {
          (window as Window & { cancelIdleCallback: (idleId: number) => void }).cancelIdleCallback(id);
        }
      };
    }
    const t = setTimeout(run, 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const formatCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : n.toLocaleString("it-IT");

  const onLoadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    const pageToFetch = nextPageRef.current;
    setIsLoading(true);
    try {
      const data = await fetchPosts(pageToFetch, categoryId);
      if (data.posts?.length) {
        setGridPosts((prev) => {
          const existingIds = new Set([...heroPosts, ...prev].map((p) => p.id));
          const newPosts = data.posts.filter((p: PostWithMeta) => !existingIds.has(p.id));
          return newPosts.length > 0 ? [...prev, ...newPosts] : prev;
        });
        nextPageRef.current = pageToFetch + 1;
        setHasMore(pageToFetch < (data.totalPages ?? 1));
      } else {
        setHasMore(false);
      }
    } catch {
      // Non disabilitare "Load more" su errore transitorio di rete.
    } finally {
      setIsLoading(false);
    }
  }, [heroPosts, hasMore, isLoading, categoryId]);

  return (
    <div className="max-w-7xl mx-auto px-0 md:px-4 py-6">
      {/* Sezione in testa: tutta la larghezza, 4 articoli (1 grande + 3 a destra). La sidebar inizia sotto. */}
      <HeroSection posts={heroPosts} />
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          {/* Banner nella colonna articoli, sopra la griglia */}
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
            emptyGridIsExpected={initialPosts.length > 0 && initialPosts.length <= 4}
          />
        </div>
        <div className="flex flex-col gap-6 lg:w-[320px] shrink-0">
          <div className="flex gap-4 items-start">
            <a
              href="https://www.facebook.com/techjournal.it"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Facebook, ${socialStats.facebook != null ? `${formatCount(socialStats.facebook)} Seguono` : "9 Seguono"}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded bg-[#3b5998] text-white text-sm font-medium hover:opacity-90"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.88 3.78-3.88 1.1 0 2.24.2 2.24.2v2.45H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0022 12z" />
              </svg>
              <span>
                {socialStats.facebook != null
                  ? `${formatCount(socialStats.facebook)} Seguono`
                  : "9 Seguono"}
              </span>
            </a>
            <a
              href="https://www.instagram.com/techjournal.it"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Instagram, ${socialStats.instagram != null ? `${formatCount(socialStats.instagram)} Followers` : "38 Followers"}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded bg-[#c13584] text-white text-sm font-medium hover:opacity-90"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.64.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.25-1.69 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.25-.15-4.77-1.69-4.92-4.92A69.2 69.2 0 012.16 12c0-3.2.01-3.58.07-4.85.15-3.25 1.69-4.77 4.92-4.92 1.27-.06 1.64-.07 4.85-.07zm0 2.18c-3.14 0-3.51.01-4.75.07-2.4.11-3.5 1.23-3.62 3.62-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.11 2.4 1.23 3.5 3.62 3.62 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c2.4-.11 3.5-1.23 3.62-3.62.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.11-2.4-1.23-3.5-3.62-3.62-1.24-.06-1.61-.07-4.75-.07zm0 3.53a4.13 4.13 0 110 8.26 4.13 4.13 0 010-8.26zm0 2.18a1.95 1.95 0 100 3.9 1.95 1.95 0 000-3.9zm5.26-2.35a.96.96 0 110 1.93.96.96 0 010-1.93z" />
              </svg>
              <span>
                {socialStats.instagram != null
                  ? `${formatCount(socialStats.instagram)} Followers`
                  : "38 Followers"}
              </span>
            </a>
          </div>
          <OfferteSidebar posts={offertePosts} />
          {/* Banner sotto la colonna Offerte */}
          <InlineBannerPlaceholder
            width="100%"
            height={250}
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_SIDEBAR}
          />
          <MostReadSidebar posts={mostReadPosts} />
          <TrendingByPeriodSidebar weekPosts={weekTrendingPosts} monthPosts={monthTrendingPosts} />
          <TrendingSidebar posts={trendingPosts} />
        </div>
      </div>
    </div>
  );
}
