import Link from "next/link";
import ShareButtons from "./ShareButtons";
import { getCategoryUrlSlugFromWpSlug, type PostWithMeta } from "@/lib/api";

interface TrendingSidebarProps {
  posts: PostWithMeta[];
  currentSlug?: string;
  currentPost?: { title: string; shareUrl: string };
}

export default function TrendingSidebar({ posts, currentSlug, currentPost }: TrendingSidebarProps) {
  const relatedPosts = currentSlug ? posts.filter((p) => p.slug !== currentSlug) : posts;
  const list = relatedPosts.slice(0, 8);

  return (
    <aside className="bg-sidebar-bg rounded-lg p-6 w-full lg:w-[280px] shrink-0 lg:sticky lg:top-4 self-start">
      {currentPost && (
        <div className="mb-6 p-4 rounded-lg bg-black/80">
          <h2 className="text-white font-bold text-sm mb-3 line-clamp-2">{currentPost.title}</h2>
          <ShareButtons title={currentPost.title} url={currentPost.shareUrl} variant="dark" />
        </div>
      )}
      <ul className="divide-y divide-white/10">
        {list.map((post) => (
          <li key={post.id} className="py-3 first:pt-0">
            <Link href={`/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`} className="group block">
              <span className="text-muted text-xs font-semibold uppercase tracking-wide">
                {post.categoryName}
              </span>
              <h3 className="text-white font-bold text-sm mt-0.5 line-clamp-2 group-hover:text-accent transition-colors">
                {post.title}
              </h3>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
