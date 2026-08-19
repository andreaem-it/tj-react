import { NextRequest, NextResponse } from "next/server";
import { getCategoryUrlSlugFromWpSlug } from "@/lib/api";
import { loadTopicArticles } from "@/lib/content/hubData";
import { getHubTopic } from "@/lib/content/topics";

/**
 * Ultimi articoli degli argomenti indicati.
 *
 * Serve all'Area personale: gli argomenti seguiti stanno in `localStorage`, quindi
 * la pagina non può essere renderizzata sul server con i dati dell'utente. Il
 * client legge le proprie preferenze e chiede qui gli articoli.
 *
 * ## Cosa non passa da qui
 *
 * La risposta **non dipende dall'utente**: contiene articoli e date, e il
 * confronto con "l'ultima volta che hai guardato" avviene nel browser. È ciò che
 * la rende cacheabile per tutti quelli che seguono gli stessi argomenti, e ciò
 * che evita di mandare al server la cronologia di lettura di qualcuno.
 */
export const dynamic = "force-dynamic";

/** Gli articoli si muovono al ritmo delle pubblicazioni, non delle visite. */
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=1800";

/** Argomenti per richiesta: oltre, la pagina fa più chiamate. */
const MAX_SLUGS = 12;
/** Articoli restituiti per argomento. */
const ARTICLES_PER_TOPIC = 5;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("slugs") ?? "";
  const slugs = [
    ...new Set(
      raw
        .split(",")
        .map((slug) => slug.trim())
        .filter(Boolean),
    ),
  ].slice(0, MAX_SLUGS);

  if (slugs.length === 0) {
    return NextResponse.json({ topics: [] }, { headers: { "Cache-Control": CACHE_CONTROL } });
  }

  const topics = await Promise.all(
    slugs.map(async (slug) => {
      // Solo argomenti del registry: uno slug arbitrario non deve poter avviare
      // una ricerca sull'upstream.
      const topic = getHubTopic(slug);
      if (!topic) return null;

      const articles = await loadTopicArticles(topic, { pages: 1 }).catch(() => []);
      return {
        slug: topic.slug,
        name: topic.name,
        href: `/topic/${topic.slug}`,
        articles: articles.slice(0, ARTICLES_PER_TOPIC).map((post) => ({
          id: post.id,
          title: post.title,
          date: post.date,
          path: `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`,
        })),
      };
    }),
  );

  return NextResponse.json(
    { topics: topics.filter((topic) => topic !== null) },
    { headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
