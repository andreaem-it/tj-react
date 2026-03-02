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
    <aside className="bg-sidebar-bg rounded-lg p-6 w-full lg:w-[320px] shrink-0 lg:sticky lg:top-[150px] self-start w-full">
      <ul className="divide-y divide-border">
        {list.map((post) => (
          <li key={post.id} className="py-3 first:pt-0">
            <Link href={`/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`} className="group block">
              <span className="text-muted text-xs font-semibold uppercase tracking-wide">
                {post.categoryName}
              </span>
              <h3 className="text-foreground font-bold text-sm mt-0.5 line-clamp-2 group-hover:text-accent transition-colors">
                {post.title}
              </h3>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
