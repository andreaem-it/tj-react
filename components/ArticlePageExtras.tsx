"use client";

import { useEffect, useState } from "react";
import type { PostWithMeta } from "@/lib/api";
import TrendingSidebar from "@/components/TrendingSidebar";
import RelatedArticlesSlider from "@/components/RelatedArticlesSlider";
import InlineBannerPlaceholder from "@/components/InlineBannerPlaceholder";
import { API_REQUEST_HEADERS } from "@/lib/constants";

interface ArticleRelatedProps {
  articleSlug: string;
  categoryId: number;
}

export function ArticleRelatedPosts({ articleSlug, categoryId }: ArticleRelatedProps) {
  const [related, setRelated] = useState<PostWithMeta[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetch("/api/posts/1", { signal: ctrl.signal, headers: API_REQUEST_HEADERS })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { posts?: PostWithMeta[] } | null) => {
        if (!data?.posts) return;
        setRelated(
          data.posts
            .filter((p) => p.slug !== articleSlug && p.categoryId === categoryId)
            .slice(0, 12),
        );
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [articleSlug, categoryId]);

  if (related.length === 0) return null;

  return (
    <footer className="mt-8 pt-6 pb-6 border-t border-border px-3 md:px-8">
      <RelatedArticlesSlider posts={related} />
    </footer>
  );
}

interface ArticleSidebarProps {
  articleSlug: string;
  postTitle: string;
  shareUrl: string;
  sidebarAdSlot?: string;
}

export function ArticleSidebar({ articleSlug, postTitle, shareUrl, sidebarAdSlot }: ArticleSidebarProps) {
  const [trending, setTrending] = useState<PostWithMeta[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetch("/api/posts/1", { signal: ctrl.signal, headers: API_REQUEST_HEADERS })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { posts?: PostWithMeta[] } | null) => {
        if (data?.posts) setTrending(data.posts);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  return (
    <aside className="w-full lg:w-[320px] shrink-0">
      <InlineBannerPlaceholder
        width="100%"
        height={250}
        className="mb-4 mx-auto block text-center"
        adSlot={sidebarAdSlot}
      />
      <TrendingSidebar
        posts={trending}
        currentSlug={articleSlug}
        currentPost={{ title: postTitle, shareUrl }}
      />
    </aside>
  );
}
