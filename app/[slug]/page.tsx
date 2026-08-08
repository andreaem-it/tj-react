import { redirect, notFound } from "next/navigation";
import {
  fetchPostBySlug,
  fetchPosts,
  fetchCategories,
  fetchPostsByCategorySlug,
  fetchPostsForInitialDisplay,
  fetchMostReadPosts,
  fetchTrendingWeekAndMonth,
  resolveCategoryByUrlSlug,
  getCategoryUrlSlugFromWpSlug,
  getCategoryUrlSlug,
} from "@/lib/api";
import HomeContent from "@/components/HomeContent";
import { SITE_URL } from "@/lib/constants";
import { postModifiedIso } from "@/lib/postDates";
import { brandedSeoTitle, seoDescription } from "@/lib/seo";
import type { Metadata } from "next";

/** Rete di sicurezza: l'invalidazione primaria arriva dal webhook di pubblicazione. */
export const revalidate = 3600;
/** Slug non prerenderizzati (post legacy, categorie nuove): generati on-demand. */
export const dynamicParams = true;

/**
 * Senza `generateStaticParams` una route con segmento dinamico resta
 * server-rendered a ogni richiesta e `revalidate` non ha alcun effetto
 * (verificabile in `.next/prerender-manifest.json`). Prerenderizzando le
 * categorie, le pagine archivio diventano statiche e servibili dalla CDN.
 *
 * Qui passano anche gli slug dei post legacy nella forma `/{slug}`, che il
 * componente redirige verso `/{categoria}/{slug}`: restano gestiti on-demand
 * grazie a `dynamicParams`.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const categories = await fetchCategories();
    // Tutte le categorie, `offerte` inclusa: qui si decide come viene resa la
    // pagina, non se indicizzarla (la sitemap la esclude, ed è una scelta
    // separata che resta valida).
    return categories.map((cat) => ({ slug: getCategoryUrlSlug(cat) }));
  } catch {
    return [];
  }
}

/** Slug che sembrano file statici: non chiamare l'API post (es. richieste errate / bot). */
const LOOKS_LIKE_STATIC_FILE = /\.(png|jpe?g|gif|webp|svg|ico|txt|xml|json|woff2?|webmanifest)$/i;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (LOOKS_LIKE_STATIC_FILE.test(slug)) {
    notFound();
  }
  const post = await fetchPostBySlug(slug);
  if (post) {
    const path = `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`;
    const canonical = `${SITE_URL.replace(/\/$/, "")}${path}`;
    const description = seoDescription(post.excerpt, post.title);
    const modifiedIso = postModifiedIso(post);
    return {
      title: { absolute: brandedSeoTitle(post.title) },
      description,
      alternates: { canonical },
      openGraph: {
        title: post.title,
        description,
        url: canonical,
        siteName: "TechJournal",
        type: "article",
        publishedTime: post.date,
        modifiedTime: modifiedIso,
      },
      twitter: { card: "summary_large_image", title: post.title, description },
      other: {
        "article:published_time": post.date,
        "article:modified_time": modifiedIso,
      },
    };
  }
  const categories = await fetchCategories();
  const cat = resolveCategoryByUrlSlug(categories, slug);
  if (cat) {
    const urlSlug = getCategoryUrlSlug(cat);
    const canonical = `${SITE_URL.replace(/\/$/, "")}/${urlSlug}`;
    const description = `Ultime notizie e articoli nella categoria ${cat.name} su TechJournal.`;
    return {
      // `absolute` obbligatorio: una stringa semplice passa dal template
      // "%s | TechJournal" del layout e produce il brand doppio
      // ("Apple | TechJournal | TechJournal").
      title: { absolute: brandedSeoTitle(cat.name) },
      description,
      alternates: { canonical },
      openGraph: { title: cat.name, description, url: canonical, siteName: "TechJournal" },
      twitter: { card: "summary", title: cat.name, description },
    };
  }
  return { title: "Pagina non trovata" };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;

  if (LOOKS_LIKE_STATIC_FILE.test(slug)) {
    notFound();
  }

  if (slug === "offerte") {
    redirect("/price-radar");
  }

  const post = await fetchPostBySlug(slug);

  if (post) {
    redirect(`/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${slug}`);
  }

  const categories = await fetchCategories();
  const cat = resolveCategoryByUrlSlug(categories, slug);
  if (!cat) notFound();

  const [
    { posts: initialPosts, totalPages, pagesConsumed },
    offertePosts,
    trendingPosts,
    mostReadPosts,
    { week: weekTrendingPosts, month: monthTrendingPosts },
  ] = await Promise.all([
    fetchPostsForInitialDisplay({ categoryId: cat.id, categories }),
    fetchPostsByCategorySlug("offerte", 5),
    fetchPosts({ perPage: 20, page: 1 }).then((r) => r.posts),
    fetchMostReadPosts({ categoryId: cat.id, limit: 5 }),
    fetchTrendingWeekAndMonth({ categoryId: cat.id, limit: 5 }),
  ]);

  return (
    <HomeContent
      initialPosts={initialPosts}
      initialTotalPages={totalPages}
      initialPagesConsumed={pagesConsumed}
      offertePosts={offertePosts}
      trendingPosts={trendingPosts}
      mostReadPosts={mostReadPosts}
      weekTrendingPosts={weekTrendingPosts}
      monthTrendingPosts={monthTrendingPosts}
      categoryId={cat.id}
    />
  );
}
