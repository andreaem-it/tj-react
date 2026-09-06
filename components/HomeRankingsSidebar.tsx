"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { PostListItem } from "@/lib/api";
import { getCategoryUrlSlugFromWpSlug } from "@/lib/categorySlugs";

type RankingKey = "read" | "week" | "month" | "hour1" | "hour6" | "hour24";

interface HomeRankingsSidebarProps {
  mostReadPosts: PostListItem[];
  weekPosts: PostListItem[];
  monthPosts: PostListItem[];
  hour1Posts?: PostListItem[];
  hour6Posts?: PostListItem[];
  hour24Posts?: PostListItem[];
}

const labels: Record<RankingKey, string> = {
  read: "Più letti",
  week: "Settimana",
  month: "Mese",
  hour1: "1 ora",
  hour6: "6 ore",
  hour24: "24 ore",
};

export default function HomeRankingsSidebar({
  mostReadPosts,
  weekPosts,
  monthPosts,
  hour1Posts = [],
  hour6Posts = [],
  hour24Posts = [],
}: HomeRankingsSidebarProps) {
  const hasVelocity = hour1Posts.length > 0 || hour6Posts.length > 0 || hour24Posts.length > 0;
  const groups = (hasVelocity
    ? { hour1: hour1Posts, hour6: hour6Posts, hour24: hour24Posts }
    : { read: mostReadPosts, week: weekPosts, month: monthPosts }) as Partial<Record<RankingKey, PostListItem[]>>;
  const firstAvailable = (Object.keys(groups) as RankingKey[]).find((key) => (groups[key]?.length ?? 0) > 0);
  const [active, setActive] = useState<RankingKey>(firstAvailable ?? "read");
  const baseId = useId();
  const tabRefs = useRef<Partial<Record<RankingKey, HTMLButtonElement>>>({});
  const posts = groups[active] ?? [];

  const selectTab = (key: RankingKey) => {
    setActive(key);
    tabRefs.current[key]?.focus();
  };

  const handleTabKeyDown = (event: React.KeyboardEvent, key: RankingKey) => {
    const enabled = (Object.keys(groups) as RankingKey[]).filter(
      (candidate) => (groups[candidate]?.length ?? 0) > 0,
    );
    const index = enabled.indexOf(key);
    let next: RankingKey | undefined;
    if (event.key === "ArrowRight") next = enabled[(index + 1) % enabled.length];
    if (event.key === "ArrowLeft") next = enabled[(index - 1 + enabled.length) % enabled.length];
    if (event.key === "Home") next = enabled[0];
    if (event.key === "End") next = enabled.at(-1);
    if (!next) return;
    event.preventDefault();
    selectTab(next);
  };

  if (!firstAvailable) return null;

  return (
    <aside className="w-full shrink-0 rounded-surface bg-sidebar-bg p-panel lg:w-[320px]" aria-label="Classifiche articoli">
      <div className="flex border-b border-border mb-4" role="tablist" aria-label="Periodo classifica">
        {(Object.keys(groups) as RankingKey[]).map((key) => (
          <button
            key={key}
            ref={(node) => {
              if (node) tabRefs.current[key] = node;
            }}
            id={`${baseId}-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={active === key}
            aria-controls={`${baseId}-panel`}
            disabled={(groups[key]?.length ?? 0) === 0}
            tabIndex={active === key ? 0 : -1}
            onClick={() => setActive(key)}
            onKeyDown={(event) => handleTabKeyDown(event, key)}
            className={`min-h-11 flex-1 px-2 text-xs font-semibold transition-colors border-b-2 -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset ${
              active === key
                ? "border-accent text-foreground"
                : "border-transparent text-muted hover:text-accent disabled:opacity-40"
            }`}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <ol
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="space-y-3"
      >
        {posts.map((post, index) => (
          <li key={post.id} className="flex items-start gap-3">
            <span className="text-muted text-sm font-semibold mt-0.5 w-5 text-right shrink-0">
              {index + 1}.
            </span>
            <div className="min-w-0">
              <Link
                href={`/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`}
                prefetch={false}
                className="group block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="text-muted text-xs font-semibold uppercase tracking-wide">
                  {post.categoryName}
                </span>
                <span className="block text-foreground font-medium text-sm mt-0.5 line-clamp-2 group-hover:text-accent transition-colors">
                  {post.title}
                </span>
              </Link>
              {active === "read" && post.viewCount != null ? (
                <span className="block text-muted text-[11px] mt-0.5">
                  {post.viewCount.toLocaleString("it-IT")} letture
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
