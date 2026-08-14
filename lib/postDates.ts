import type { PostWithMeta } from "@/lib/api";

/**
 * Data ultima modifica ISO per SEO/JSON-LD; fallback alla pubblicazione se l’API
 * non espone `modified`.
 *
 * Accetta il minimo indispensabile invece di `PostWithMeta`: così funziona sia
 * col post completo (pagina articolo) sia con i `PostListItem` di feed e liste.
 */
export function postModifiedIso(post: Pick<PostWithMeta, "date" | "modified">): string {
  const m = typeof post.modified === "string" ? post.modified.trim() : "";
  return m.length > 0 ? m : post.date;
}
