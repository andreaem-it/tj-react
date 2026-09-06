import assert from "node:assert/strict";
import { test } from "node:test";
import type { PostListItem } from "../../lib/api";
import { rankPostsByVelocity } from "../../lib/home/trendingVelocity";

const post = (id: number, date: string): PostListItem => ({
  id, slug: `post-${id}`, title: `Post ${id}`, excerpt: "", date,
  categoryId: 1, categoryName: "Tech", categorySlug: "tech",
  authorName: "TechJournal", authorAvatarUrl: "", viewCount: 0,
  imageUrl: "", imageAlt: "",
});

test("ordina separatamente le finestre 1h, 6h e 24h", () => {
  const posts = [post(1, "2026-08-30T10:00:00Z"), post(2, "2026-08-30T11:00:00Z")];
  const ranked = rankPostsByVelocity(posts, [
    { postId: 1, views1h: 8, views6h: 8, views24h: 20 },
    { postId: 2, views1h: 2, views6h: 12, views24h: 30 },
  ]);
  assert.deepEqual(ranked.hour1.map((item) => item.id), [1, 2]);
  assert.deepEqual(ranked.hour6.map((item) => item.id), [2, 1]);
  assert.deepEqual(ranked.hour24.map((item) => item.id), [2, 1]);
});

test("esclude articoli senza segnale nella finestra", () => {
  const ranked = rankPostsByVelocity([post(1, "2026-08-30T10:00:00Z")], [
    { postId: 1, views1h: 0, views6h: 1, views24h: 1 },
  ]);
  assert.deepEqual(ranked.hour1, []);
  assert.equal(ranked.hour6[0]?.id, 1);
});
