import { fetchCategories, fetchPosts, fetchPostsForMegamenu, getCategoryUrlSlug, MEGAMENU_POSTS_TARGET, resolveCategoryByUrlSlug } from "@/lib/api";
import HeaderClient from "./HeaderClient";

const MEGAMENU_SLUGS = ["apple", "apps", "tech", "gaming", "smart-home", "ia", "offerte"];

export default async function Header() {
  const categories = await fetchCategories();
  const categoryLinks: Record<string, string> = Object.fromEntries(
    categories.map((c) => [getCategoryUrlSlug(c), String(c.id)])
  );

  const megamenuBySlug: Record<string, { slug: string; title: string; imageUrl: string | null; imageAlt: string }[]> = {};
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

  return <HeaderClient categoryLinks={categoryLinks} megamenuBySlug={megamenuBySlug} />;
}
