import type { PostListItem } from "@/lib/api";
import TrendingSidebar from "@/components/TrendingSidebar";
import RelatedArticlesSlider from "@/components/RelatedArticlesSlider";
import InlineBannerPlaceholder from "@/components/InlineBannerPlaceholder";

interface ArticleRelatedProps {
  /** Correlati già caricati lato server (fetchRelatedPosts). */
  posts: PostListItem[];
}

export function ArticleRelatedPosts({ posts }: ArticleRelatedProps) {
  if (posts.length === 0) return null;

  return (
    <footer className="mt-8 pt-6 pb-6 border-t border-border px-3 md:px-8">
      <RelatedArticlesSlider posts={posts} />
    </footer>
  );
}

interface ArticleSidebarProps {
  articleSlug: string;
  /** Trending già caricati lato server (fetchMostReadPosts / fetchTrendingWeekAndMonth). */
  trendingPosts: PostListItem[];
  postTitle: string;
  shareUrl: string;
  sidebarAdSlot?: string;
}

export function ArticleSidebar({
  articleSlug,
  trendingPosts,
  postTitle,
  shareUrl,
  sidebarAdSlot,
}: ArticleSidebarProps) {
  return (
    <aside className="w-full lg:w-[320px] shrink-0">
      <InlineBannerPlaceholder
        width="100%"
        height={250}
        className="mb-4 mx-auto block text-center"
        adSlot={sidebarAdSlot}
      />
      <TrendingSidebar
        posts={trendingPosts}
        currentSlug={articleSlug}
        currentPost={{ title: postTitle, shareUrl }}
      />
    </aside>
  );
}
