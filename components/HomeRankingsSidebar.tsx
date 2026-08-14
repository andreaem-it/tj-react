"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { getCategoryUrlSlugFromWpSlug, type PostListItem } from "@/lib/api";

type RankingKey = "read" | "week" | "month";

interface HomeRankingsSidebarProps {
  mostReadPosts: PostListItem[];
  weekPosts: PostListItem[];
  monthPosts: PostListItem[];
}

const labels: Record<RankingKey, string> = {
  read: "Più letti",
  week: "Settimana",
  month: "Mese",
};

export default function HomeRankingsSidebar({
  mostReadPosts,
  weekPosts,
  monthPosts,
}: HomeRankingsSidebarProps) {
  const groups: Record<RankingKey, PostListItem[]> = {
    read: mostReadPosts,
    week: weekPosts,
    month: monthPosts,
  };
  const firstAvailable = (Object.keys(groups) as RankingKey[]).find((key) => groups[key].length > 0);
  const [active, setActive] = useState<RankingKey>(firstAvailable ?? "read");
  const baseId = useId();
  const posts = groups[active];

  if (!firstAvailable) return null;

  return (
    <aside className="bg-sidebar-bg rounded-lg p-6 w-full lg:w-[320px] shrink-0" aria-label="Classifiche articoli">
      <div className="flex border-b border-border mb-4" role="tablist" aria-label="Periodo classifica">
        {(Object.keys(groups) as RankingKey[]).map((key) => (
          <button
            key={key}
            id={`${baseId}-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={active === key}
            aria-controls={`${baseId}-panel`}
            disabled={groups[key].length === 0}
            onClick={() => setActive(key)}
            className={`min-h-11 flex-1 px-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
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
                className="group block"
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
