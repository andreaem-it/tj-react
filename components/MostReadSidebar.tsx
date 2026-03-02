import Link from "next/link";
import { getCategoryUrlSlugFromWpSlug, type PostWithMeta } from "@/lib/api";

interface MostReadSidebarProps {
  posts: PostWithMeta[];
  title?: string;
}

export default function MostReadSidebar({ posts, title = "Più letti" }: MostReadSidebarProps) {
  if (!posts.length) return null;

  return (
    <aside className="bg-sidebar-bg rounded-lg p-6 w-full lg:w-[320px] shrink-0">
      <h2 className="text-foreground font-bold text-lg mb-4">{title}</h2>
      <ol className="space-y-3">
        {posts.map((post, index) => (
          <li key={post.id} className="flex items-start gap-3">
            <span className="text-muted text-sm font-semibold mt-0.5 w-5 text-right">
              {index + 1}.
            </span>
            <div className="min-w-0">
              <Link
                href={`/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`}
                className="group block"
              >
                <p className="text-muted text-xs font-semibold uppercase tracking-wide">
                  {post.categoryName}
                </p>
                <h3 className="text-foreground font-medium text-sm mt-0.5 line-clamp-2 group-hover:text-accent transition-colors">
                  {post.title}
                </h3>
              </Link>
              {post.viewCount != null && (
                <p className="text-muted text-[11px] mt-0.5">
                  {post.viewCount.toLocaleString("it-IT")} letture
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

