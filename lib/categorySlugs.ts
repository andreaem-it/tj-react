/** Mapping URL pubbliche → slug WordPress. Modulo puro, utilizzabile anche dai Client Components. */
const URL_SLUG_TO_WP_SLUG: Readonly<Record<string, string>> = {
  apps: "applicazioni",
  gaming: "games",
  tech: "tecnologia",
  ia: "intelligenza-artificiale",
};

const WP_SLUG_TO_URL_SLUG: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(URL_SLUG_TO_WP_SLUG).map(([url, wp]) => [wp, url]),
);

export function getCategoryUrlSlug(category: { slug: string }): string {
  return getCategoryUrlSlugFromWpSlug(category.slug);
}

export function getCategoryUrlSlugFromWpSlug(wpSlug: string): string {
  return WP_SLUG_TO_URL_SLUG[wpSlug] ?? wpSlug;
}

export function resolveCategoryByUrlSlug<T extends { slug: string }>(
  categories: T[],
  urlSlug: string,
): T | undefined {
  const wpSlug = URL_SLUG_TO_WP_SLUG[urlSlug] ?? urlSlug;
  return categories.find((category) => category.slug === wpSlug);
}
