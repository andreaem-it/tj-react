"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebookF, faInstagram } from "@fortawesome/free-brands-svg-icons";
import HeroSection from "./HeroSection";
import PostsGrid from "./PostsGrid";
import OfferteSidebar from "./OfferteSidebar";
import TrendingSidebar from "./TrendingSidebar";
import MostReadSidebar from "./MostReadSidebar";
import TrendingByPeriodSidebar from "./TrendingByPeriodSidebar";
import InlineBannerPlaceholder from "./InlineBannerPlaceholder";
import type { PostWithMeta } from "@/lib/api";

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
    const url = `${window.location.origin}/api/social-stats?t=${Date.now()}`;
    fetch(url, { cache: "no-store", credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { facebook?: { followers: number } | null; instagram?: { followers: number } | null } | null) => {
        if (cancelled || !data) return;
        setSocialStats({
          facebook: data.facebook?.followers ?? null,
          instagram: data.instagram?.followers ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : n.toLocaleString("it-IT");

  const onLoadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    const pageToFetch = nextPageRef.current;
    setIsLoading(true);
    try {
      const url = `${window.location.origin}/api/posts/${pageToFetch}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = res.ok ? await res.json() : { posts: [], totalPages: 0 };
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
    } finally {
      setIsLoading(false);
    }
  }, [heroPosts, hasMore, isLoading, categoryId]);

  return (
    <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-6">
      {/* Sezione in testa: tutta la larghezza, 4 articoli (1 grande + 3 a destra). La sidebar inizia sotto. */}
      <HeroSection posts={heroPosts} />
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
          {/* Banner nella colonna articoli, sopra la griglia */}
          <InlineBannerPlaceholder width="100%" height={90} className="mb-6" />
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
              aria-label="Facebook"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded bg-[#3b5998] text-white text-sm font-medium hover:opacity-90"
            >
              <FontAwesomeIcon icon={faFacebookF} className="w-5 h-5" />
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
              aria-label="Instagram"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded bg-[#E4405F] text-white text-sm font-medium hover:opacity-90"
            >
              <FontAwesomeIcon icon={faInstagram} className="w-5 h-5" />
              <span>
                {socialStats.instagram != null
                  ? `${formatCount(socialStats.instagram)} Followers`
                  : "38 Followers"}
              </span>
            </a>
          </div>
          <OfferteSidebar posts={offertePosts} />
          {/* Banner sotto la colonna Offerte */}
          <InlineBannerPlaceholder width="100%" height={250} />
          <MostReadSidebar posts={mostReadPosts} />
          <TrendingByPeriodSidebar weekPosts={weekTrendingPosts} monthPosts={monthTrendingPosts} />
          <TrendingSidebar posts={trendingPosts} />
        </div>
      </div>
    </div>
  );
}
