import Link from "next/link";
import ShareButtons from "./ShareButtons";
import type { PostWithMeta } from "@/lib/api";

interface TrendingSidebarProps {
  posts: PostWithMeta[];
  currentSlug?: string;
}

export default function TrendingSidebar({ posts, currentSlug }: TrendingSidebarProps) {
  const displayPosts = currentSlug ? posts.filter((p) => p.slug !== currentSlug) : posts;
  const featured = displayPosts[0];
  const list = displayPosts.slice(1, 8);

  return (
    <aside className="bg-sidebar-bg rounded-lg p-6 w-full lg:w-[320px] shrink-0">
      {featured && (
        <div className="mb-6">
          <h2 className="text-white font-bold text-lg mb-2 line-clamp-2">{featured.title}</h2>
          <ShareButtons title={featured.title} url={`https://www.techjournal.it/${featured.slug}/`} />
          <p className="text-muted text-xs mt-2">Personalizza pulsanti</p>
        </div>
      )}
      <ul className="space-y-4">
        {list.map((post) => (
          <li key={post.id}>
            <Link href={`/${post.slug}`} className="group block">
              <span className="text-accent text-xs font-semibold uppercase tracking-wide">
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
