import Link from "next/link";
import { getCategoryUrlSlugFromWpSlug, type PostWithMeta } from "@/lib/api";

interface TrendingByPeriodSidebarProps {
  weekPosts: PostWithMeta[];
  monthPosts: PostWithMeta[];
}

function PostList({ posts, title }: { posts: PostWithMeta[]; title: string }) {
  if (posts.length === 0) return null;
  return (
    <div className="mb-6 last:mb-0">
      <h2 className="text-foreground font-bold text-sm mb-3">{title}</h2>
      <ol className="space-y-2">
        {posts.map((post, index) => (
          <li key={post.id} className="flex items-start gap-2">
            <span className="text-muted text-xs font-semibold mt-0.5 w-4 text-right shrink-0">
              {index + 1}.
            </span>
            <Link
              href={`/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`}
              className="text-foreground text-sm font-medium line-clamp-2 hover:text-accent transition-colors min-w-0"
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function TrendingByPeriodSidebar({ weekPosts, monthPosts }: TrendingByPeriodSidebarProps) {
  if (weekPosts.length === 0 && monthPosts.length === 0) return null;

  return (
    <aside className="bg-sidebar-bg rounded-lg p-6 w-full lg:w-[320px] shrink-0">
      <h2 className="text-foreground font-bold text-lg mb-4">Trending per periodo</h2>
      <PostList posts={weekPosts} title="Top della settimana" />
      <PostList posts={monthPosts} title="Top del mese" />
    </aside>
  );
}
