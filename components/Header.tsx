import { fetchCategories, fetchPosts, fetchPostsForMegamenu, getCategoryUrlSlug, MEGAMENU_POSTS_TARGET, resolveCategoryByUrlSlug } from "@/lib/api";
import HeaderClient from "./HeaderClient";

const MEGAMENU_SLUGS = ["apple", "apps", "tech", "gaming", "smart-home", "ia", "offerte"];

const emptyMegamenuBySlug: Record<string, { slug: string; title: string; imageUrl: string | null; imageAlt: string }[]> = Object.fromEntries(
  MEGAMENU_SLUGS.map((s) => [s, []])
);

export default async function Header() {
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  try {
    categories = await fetchCategories();
  } catch {
    // API irraggiungibile (rete, DNS, backend down): header con menu vuoti
  }
  const categoryLinks: Record<string, string> = Object.fromEntries(
    categories.map((c) => [getCategoryUrlSlug(c), String(c.id)])
  );

  const megamenuBySlug: Record<string, { slug: string; title: string; imageUrl: string | null; imageAlt: string }[]> = { ...emptyMegamenuBySlug };
  try {
    await Promise.all(
      MEGAMENU_SLUGS.map(async (menuSlug) => {
        const cat = resolveCategoryByUrlSlug(categories, menuSlug);
        const id = cat?.id;
        const posts = id != null
          ? await fetchPostsForMegamenu({ categoryId: id, categories })
          : (await fetchPosts({ perPage: MEGAMENU_POSTS_TARGET, page: 1 })).posts;
        megamenuBySlug[menuSlug] = posts.map((p) => ({
          slug: p.slug,
          title: p.title,
          imageUrl: p.imageUrl,
          imageAlt: p.imageAlt,
        }));
      })
    );
  } catch {
    // API irraggiungibile: megamenu vuoti già inizializzati
  }

  return <HeaderClient categoryLinks={categoryLinks} megamenuBySlug={megamenuBySlug} />;
}
