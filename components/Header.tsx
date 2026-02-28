import Image from "next/image";
import Link from "next/link";
import { fetchCategories, fetchPosts, fetchPostsForMegamenu, getCategoryUrlSlug, MEGAMENU_POSTS_TARGET, resolveCategoryByUrlSlug } from "@/lib/api";
import NavBar from "./NavBar";

const LOGO_URL = "https://static.techjournal.it/2024/01/logo-techjournal-250.png";

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

  return (
    <header className="sticky top-0 z-50 bg-header-bg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src={LOGO_URL}
              alt="TechJournal"
              width={250}
              height={50}
              className="h-9 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <a
              href="https://www.facebook.com/techjournal.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/90 hover:text-accent transition-colors"
              aria-label="Facebook"
            >
              <span className="text-lg font-semibold">f</span>
            </a>
            <a
              href="https://www.instagram.com/techjournal.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/90 hover:text-accent transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          </div>
        </div>
        <NavBar categoryLinks={categoryLinks} megamenuBySlug={megamenuBySlug} />
      </div>
    </header>
  );
}
