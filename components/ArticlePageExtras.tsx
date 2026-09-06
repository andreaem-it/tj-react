import type { PostListItem } from "@/lib/api";
import TrendingSidebar from "@/components/TrendingSidebar";
import RelatedArticlesSlider from "@/components/RelatedArticlesSlider";
import InlineBannerPlaceholder from "@/components/InlineBannerPlaceholder";

interface ArticleRelatedProps {
  /** Correlati già caricati lato server (`loadArticleRelated`). */
  posts: PostListItem[];
  /**
   * I correlati derivano dagli argomenti in comune e non dalla sola categoria.
   *
   * Cambia l'intestazione: "Articoli correlati" è una promessa di pertinenza, e
   * va fatta solo quando la pertinenza è stata calcolata. Sul ripiego di
   * categoria si dichiara ciò che sono davvero.
   */
  byTopic?: boolean;
}

export function ArticleRelatedPosts({ posts, byTopic = true }: ArticleRelatedProps) {
  if (posts.length === 0) return null;

  return (
    <footer className="mt-8 pt-6 pb-6 border-t border-border px-3 md:px-8">
      <RelatedArticlesSlider
        posts={posts}
        heading={byTopic ? "Articoli correlati" : "Altri articoli della categoria"}
      />
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
