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
  fetchCategoryPostCount,
  type WPCategory,
} from "@/lib/api";
import HomeContent from "@/components/HomeContent";
import { SITE_URL } from "@/lib/constants";
import { postModifiedIso } from "@/lib/postDates";
import {
  brandedSeoTitle,
  seoDescription,
  MIN_POSTS_FOR_INDEXABLE_CATEGORY,
} from "@/lib/seo";
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

/**
 * Etichetta univoca della categoria per title, description e H1.
 *
 * Due categorie WP possono condividere il `name`: "iOS" esiste sia su `/ios`
 * sia su `/ios-games`, e usando solo `cat.name` i due archivi ottenevano title
 * e description **identici** su URL entrambi indicizzabili. Quando c'è
 * collisione si ricade sullo slug, che è unico per definizione.
 */
function categoryLabel(cat: WPCategory, categories: WPCategory[]): string {
  const collides = categories.some((c) => c.id !== cat.id && c.name === cat.name);
  if (!collides) return cat.name;

  const urlSlug = getCategoryUrlSlug(cat);
  const namePrefix = cat.name.toLowerCase().replace(/\s+/g, "-");
  // "iOS" + slug "ios-games" -> si tiene la capitalizzazione redazionale del
  // nome e si aggiunge solo la parte distintiva ("iOS Games", non "Ios Games").
  const rest = urlSlug.startsWith(`${namePrefix}-`) ? urlSlug.slice(namePrefix.length + 1) : urlSlug;
  // Se lo slug non aggiunge nulla al nome (slug "ios" per la categoria "iOS")
  // non c'è niente da distinguere: raddoppiarlo darebbe "iOS Ios".
  if (!rest || rest.replace(/-/g, " ").toLowerCase() === cat.name.toLowerCase()) {
    return cat.name;
  }
  const humanized = rest
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
  return `${cat.name} ${humanized}`;
}

/**
 * Description dell'archivio: 70-160 caratteri.
 *
 * La versione precedente ("Ultime notizie e articoli nella categoria X su
 * TechJournal.") si fermava a 61-69 caratteri su ogni archivio — sotto la
 * soglia utile e segnalata come "too short" su 17 pagine dall'audit.
 */
function categoryDescription(label: string): string {
  return `Tutte le notizie su ${label}: aggiornamenti quotidiani, approfondimenti, guide e recensioni selezionate dalla redazione di TechJournal.`;
}

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
    const label = categoryLabel(cat, categories);
    const description = categoryDescription(label);
    // `null` = conteggio non disponibile (upstream in errore): si lascia
    // indicizzabile. Meglio un archivio scarno di troppo in indice che togliere
    // /apple dall'indice per un timeout dell'API.
    const postCount = await fetchCategoryPostCount(cat.id, categories);
    const isThin = postCount !== null && postCount < MIN_POSTS_FOR_INDEXABLE_CATEGORY;
    return {
      // `absolute` obbligatorio: una stringa semplice passa dal template
      // "%s | TechJournal" del layout e produce il brand doppio
      // ("Apple | TechJournal | TechJournal").
      title: { absolute: brandedSeoTitle(label) },
      description,
      alternates: { canonical },
      // `follow` sempre attivo: l'archivio non va in indice ma i link agli
      // articoli devono continuare a passare segnali.
      ...(isThin ? { robots: { index: false, follow: true } } : {}),
      openGraph: { title: label, description, url: canonical, siteName: "TechJournal" },
      twitter: { card: "summary", title: label, description },
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
      // Senza questo, l'archivio erediterebbe l'H1 della home: stesso H1 su
      // /apple, /tech, /ia… e in contraddizione col title della pagina.
      heading={`${categoryLabel(cat, categories)}: ultime notizie e articoli`}
    />
  );
}
