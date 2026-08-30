import type { PostListItem } from "@/lib/api";
import { getTjApiBaseUrl } from "@/lib/config/tjApi";

export interface ViewVelocity {
  postId: number;
  views1h: number;
  views6h: number;
  views24h: number;
}

export function rankPostsByVelocity(
  posts: readonly PostListItem[],
  metrics: readonly ViewVelocity[],
  limit = 5,
): { hour1: PostListItem[]; hour6: PostListItem[]; hour24: PostListItem[] } {
  const byId = new Map(metrics.map((metric) => [metric.postId, metric]));
  const rank = (field: "views1h" | "views6h" | "views24h") => [...posts]
    .filter((post) => (byId.get(post.id)?.[field] ?? 0) > 0)
    .sort((a, b) =>
      (byId.get(b.id)?.[field] ?? 0) - (byId.get(a.id)?.[field] ?? 0)
      || new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
  return { hour1: rank("views1h"), hour6: rank("views6h"), hour24: rank("views24h") };
}

export async function fetchTrendingVelocity(
  posts: readonly PostListItem[],
  limit = 5,
): Promise<{ hour1: PostListItem[]; hour6: PostListItem[]; hour24: PostListItem[] }> {
  const unique = [...new Map(posts.map((post) => [post.id, post])).values()].slice(0, 100);
  const base = getTjApiBaseUrl();
  if (!base || unique.length === 0) return { hour1: [], hour6: [], hour24: [] };
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "TechJournal-Frontend/1.0 (+https://www.techjournal.it)",
  };
  const bypass = process.env.TJ_API_BYPASS_TOKEN?.trim();
  if (bypass) headers["X-TJ-API-Token"] = bypass;
  const protection = process.env.TJ_API_PROTECTION_BYPASS_SECRET?.trim();
  if (protection) headers["x-vercel-protection-bypass"] = protection;
  const params = new URLSearchParams({ postIds: unique.map((post) => post.id).join(",") });
  const response = await fetch(`${base}/api/views-trending?${params}`, {
    headers,
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return { hour1: [], hour6: [], hour24: [] };
  const data = (await response.json()) as { items?: ViewVelocity[] };
  return rankPostsByVelocity(unique, Array.isArray(data.items) ? data.items : [], limit);
}
