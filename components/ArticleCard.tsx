"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getCategoryUrlSlugFromWpSlug, type PostWithMeta } from "@/lib/api";

interface ArticleCardProps {
  post: PostWithMeta;
  variant?: "default" | "hero" | "strip";
  size?: "large" | "medium" | "small";
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

export default function ArticleCard({ post, variant = "default", size }: ArticleCardProps) {
  const [heroImageError, setHeroImageError] = useState(false);
  const categoryUrlSlug = getCategoryUrlSlugFromWpSlug(post.categorySlug);
  const href = `/${categoryUrlSlug}/${post.slug}`;
  const categoryHref = `/${categoryUrlSlug}`;
  const showHeroImage = variant === "hero" && post.imageUrl && !heroImageError;

  if (variant === "strip") {
    return (
      <Link href={href} className="group block">
        <div className="relative overflow-hidden rounded-lg aspect-[4/3] bg-content-bg mb-2">
          {post.imageUrl && (
            <Image
              src={post.imageUrl}
              alt={post.imageAlt}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 20vw"
            />
          )}
        </div>
        <h2 className="text-white font-semibold text-sm line-clamp-2 group-hover:text-accent transition-colors">
          {post.title}
        </h2>
      </Link>
    );
  }

  if (variant === "hero") {
    const titleLines = size === "large" ? 2 : size === "medium" ? 3 : 2;
    const titleSize = size === "large" ? "text-base md:text-xl" : size === "medium" ? "text-sm md:text-base" : "text-xs md:text-sm";
    return (
      <Link href={href} className="group block relative overflow-hidden rounded-lg h-full min-h-[120px] w-full bg-sidebar-bg">
        {showHeroImage ? (
          <Image
            src={post.imageUrl!}
            alt={post.imageAlt}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
            onError={() => setHeroImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-sidebar-bg" aria-hidden />
        )}
        {/* Overlay scuro in basso: titolo sempre leggibile anche con immagine chiara o mancante */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" aria-hidden />
        {/* In basso: label categoria (arancione); sotto, titolo con sfondo nero che segue ogni riga del testo */}
        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3 max-w-full z-[1]">
          <span className="block bg-accent text-white text-[10px] md:text-xs font-semibold uppercase tracking-wide px-2 py-0.5 mb-1 w-fit">
            {post.categoryName}
          </span>
          {/* box-decoration-clone: lo sfondo nero viene applicato a ogni riga del testo, non a un contenitore */}
          <span
            className={`block overflow-hidden max-w-full ${titleLines === 2 ? "line-clamp-2" : "line-clamp-3"}`}
            style={{ display: "block" }}
          >
            <span
              className={`inline text-white font-bold ${titleSize} uppercase leading-tight bg-black px-2 py-0.5 md:px-3 md:py-1`}
              style={{ boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}
            >
              {post.title}
            </span>
          </span>
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
