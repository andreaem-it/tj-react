import Image from "next/image";
import Link from "next/link";
import type { PostWithMeta } from "@/lib/api";

interface ArticleCardProps {
  post: PostWithMeta;
  variant?: "default" | "hero";
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

export default function ArticleCard({ post, variant = "default" }: ArticleCardProps) {
  const href = `/${post.slug}`;
  const categoryHref = `/category/${post.categoryId}`;

  if (variant === "hero") {
    return (
      <Link href={href} className="group block relative overflow-hidden rounded-lg aspect-[16/10] min-h-[200px]">
        {post.imageUrl && (
          <Image
            src={post.imageUrl}
            alt={post.imageAlt}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className="inline-block text-accent text-xs font-semibold uppercase tracking-wide mb-1">
            {post.categoryName}
          </span>
          <h2 className="text-white font-bold text-lg line-clamp-2">{post.title}</h2>
        </div>
      </Link>
    );
  }

  return (
    <article className="flex flex-col group">
      <Link href={href} className="block overflow-hidden rounded-lg aspect-[16/10] relative bg-content-bg">
        {post.imageUrl ? (
          <Image
            src={post.imageUrl}
            alt={post.imageAlt}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="absolute inset-0 bg-sidebar-bg" />
        )}
      </Link>
      <div className="pt-2">
        <Link
          href={categoryHref}
          className="text-accent text-xs font-semibold uppercase tracking-wide hover:underline"
        >
          {post.categoryName}
        </Link>
        <Link href={href}>
          <h2 className="text-foreground font-bold text-base mt-1 line-clamp-2 hover:text-accent transition-colors">
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
