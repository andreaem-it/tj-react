import type { PostWithMeta } from "@/lib/api";

/** Data ultima modifica ISO per SEO/JSON-LD; fallback alla pubblicazione se l’API non espone `modified`. */
export function postModifiedIso(post: PostWithMeta): string {
  const m = typeof post.modified === "string" ? post.modified.trim() : "";
  return m.length > 0 ? m : post.date;
}
