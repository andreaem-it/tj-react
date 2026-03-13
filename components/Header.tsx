import { fetchCategories, getCategoryUrlSlug } from "@/lib/api";
import HeaderClient from "./HeaderClient";

/** Megamenu caricato client-side on-demand (hover) per non saturare lsphp. */
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

  return <HeaderClient categoryLinks={categoryLinks} megamenuBySlug={{}} />;
}
