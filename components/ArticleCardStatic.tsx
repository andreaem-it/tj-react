import Image from "next/image";
import Link from "next/link";
import { getCategoryUrlSlugFromWpSlug, type PostWithMeta } from "@/lib/api";
import { BLUR_DATA_URL } from "@/lib/constants";

interface ArticleCardStaticProps {
  post: PostWithMeta;
  priority?: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} min fa`;
  if (diffHours < 24) return `${diffHours} ore fa`;
  if (diffDays < 7) return `${diffDays} giorni fa`;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

export default function ArticleCardStatic({ post, priority }: ArticleCardStaticProps) {
  const categoryUrlSlug = getCategoryUrlSlugFromWpSlug(post.categorySlug);
  const href = `/${categoryUrlSlug}/${post.slug}`;
  const categoryHref = `/${categoryUrlSlug}`;

  return (
    <article className="flex flex-col group">
      <Link href={href} className="block overflow-hidden rounded-lg aspect-[16/10] relative bg-content-bg">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt={post.imageAlt}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0 bg-sidebar-bg" />
        )}
      </Link>
      <div className="pt-2">
        <Link href={categoryHref} className="text-accent text-xs font-semibold uppercase tracking-wide hover:underline">
          {post.categoryName}
        </Link>
        <Link href={href}>
          <h2 className="text-foreground font-bold text-base mt-1 line-clamp-2 min-h-11 hover:text-accent transition-colors">
            {post.title}
          </h2>
        </Link>
        <time className="text-muted text-sm mt-1 block" dateTime={post.date}>
          {formatDate(post.date)}
        </time>
      </div>
    </article>
  );
}
