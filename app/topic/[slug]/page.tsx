import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCardStatic from "@/components/ArticleCardStatic";
import ArticleTopics from "@/components/article/ArticleTopics";
import Breadcrumbs from "@/components/Breadcrumbs";
import TjLink from "@/components/TjLink";
import FollowTopicButton from "@/components/personal/FollowTopicButton";
import { getCategoryUrlSlugFromWpSlug, type PostListItem } from "@/lib/api";
import { SITE_URL } from "@/lib/constants";
import { classifyPost, isEvergreen } from "@/lib/content/classify";
import { loadTopicArticles, loadTopicHub } from "@/lib/content/hubData";
import { getHubTopic, HUB_TOPICS, relatedTopics } from "@/lib/content/topics";
import { MIN_ARTICLES_FOR_INDEXABLE_HUB } from "@/lib/seo";

/**
 * Hub di argomento (§9).
 *
 * Aggrega automaticamente ciò che oggi è disperso fra categorie diverse: nel
 * campione di produzione cinque articoli su iPhone 18 stanno in quattro
 * categorie distinte. L'hub è la pagina che quella storia non ha.
 *
 * Tutto quello che mostra è **derivato**: nessun campo redazionale da compilare,
 * nessun contenuto generato. Quando esce un articolo l'hub si aggiorna al
 * revalidate successivo.
 */
export const revalidate = 3600;

/**
 * Il registry è un insieme chiuso: uno slug che non c'è non può diventare valido
 * a runtime. Con `dynamicParams: false` Next risponde 404 senza invocare la
 * funzione, invece di renderizzare e poi scoprire di dover chiamare `notFound()`.
 */
export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return HUB_TOPICS.map((topic) => ({ slug: topic.slug }));
}

const BASE = SITE_URL.replace(/\/$/, "");

/** Notizie mostrate come griglia prima della cronologia. */
const LATEST_GRID_SIZE = 6;
/** Voci massime della cronologia. */
const TIMELINE_SIZE = 15;
/** Contenuti evergreen elencati nel blocco guide. */
const GUIDES_SIZE = 6;

interface TopicPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getHubTopic(slug);
  if (!topic) return { title: "Argomento non trovato", robots: { index: false, follow: false } };

  // Stessa chiamata del render: passa dalla Data Cache, quindi non è una seconda
  // richiesta all'upstream.
  const articles = await loadTopicArticles(topic);
  const isThin = articles.length < MIN_ARTICLES_FOR_INDEXABLE_HUB;
  const canonical = `${BASE}/topic/${topic.slug}`;

  return {
    // `absolute`: senza, il template "%s | TechJournal" del layout raddoppierebbe
    // il brand quando il titolo lo contiene già.
    title: { absolute: `${topic.name}: notizie, guide e aggiornamenti | TechJournal` },
    description: topic.description,
    alternates: { canonical },
    // `follow` resta attivo anche sugli hub sottili: i link agli articoli devono
    // continuare a passare segnali.
    ...(isThin ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: topic.name,
      description: topic.description,
      url: canonical,
      siteName: "TechJournal",
      type: "website",
    },
    twitter: { card: "summary", title: topic.name, description: topic.description },
  };
}

function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

function articleHref(post: PostListItem): string {
  return `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`;
}

function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-4 text-lg font-bold text-foreground md:text-xl">
      {children}
    </h2>
  );
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const topic = getHubTopic(slug);
  if (!topic) notFound();

  const { articles, compatibilityHref } = await loadTopicHub(topic);

  /**
   * Separazione fra attualità e contenuti evergreen.
   *
   * Non è una distinzione estetica: una guida e una notizia rispondono a
   * intenzioni diverse, e mescolarle in un unico elenco cronologico
   * seppellirebbe la guida sotto le beta della settimana pur essendo il
   * contenuto che il lettore cerca più a lungo.
   */
  const classified = articles.map((post) => ({
    post,
    ...classifyPost({
      title: post.title,
      excerpt: post.excerpt,
      categorySlug: post.categorySlug,
    }),
  }));

  const evergreen = classified.filter((item) => isEvergreen(item.contentType));
  const news = classified.filter((item) => !isEvergreen(item.contentType));

  const latest = news.slice(0, LATEST_GRID_SIZE);
  // La cronologia riprende da dove finisce la griglia: gli stessi articoli
  // elencati due volte sarebbero solo un modo di allungare la pagina.
  const timeline = news.slice(LATEST_GRID_SIZE, LATEST_GRID_SIZE + TIMELINE_SIZE);
  const related = relatedTopics(topic);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: topic.name,
    description: topic.description,
    url: `${BASE}/topic/${topic.slug}`,
    inLanguage: "it-IT",
    isPartOf: { "@id": `${BASE}/#website` },
    about: {
      "@type": "Thing",
      "@id": `${BASE}/topic/${topic.slug}`,
      name: topic.name,
    },
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-[5px] py-6 md:px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mb-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Argomenti", href: "/topic" },
            { label: topic.name },
          ]}
        />
        <h1 className="text-2xl font-bold text-foreground md:text-4xl">{topic.name}</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">{topic.description}</p>
        {/* Il motivo per tornare: seguire l'argomento e trovare le novità in
            Area personale. Nessun account — lo stato vive nel browser. */}
        <FollowTopicButton slug={topic.slug} name={topic.name} className="mt-4" />

        {/* Stato dell'argomento con i soli dati che abbiamo davvero. Nessuna
            "versione corrente" o "data di rilascio prevista": sarebbero campi da
            mantenere a mano, e sbagliati appena smettessimo di farlo. */}
        {articles.length > 0 && (
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-muted">Articoli</dt>
              <dd className="font-semibold text-foreground">{articles.length}</dd>
            </div>
            <div>
              <dt className="text-muted">Ultimo aggiornamento</dt>
              <dd className="font-semibold text-foreground">
                <time dateTime={articles[0].date}>{formatDay(articles[0].date)}</time>
              </dd>
            </div>
          </dl>
        )}
      </header>

      {articles.length === 0 ? (
        <p className="py-8 text-muted">
          Non ci sono ancora articoli su questo argomento.{" "}
          <TjLink href="/" className="text-accent hover:underline">
            Torna alla home
          </TjLink>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {latest.length > 0 && (
            <section aria-labelledby="tj-topic-latest">
              <SectionTitle id="tj-topic-latest">Ultime notizie</SectionTitle>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {latest.map(({ post }, index) => (
                  <ArticleCardStatic key={post.id} post={post} priority={index < 3} />
                ))}
              </div>
            </section>
          )}

          {evergreen.length > 0 && (
            <section aria-labelledby="tj-topic-guides">
              <SectionTitle id="tj-topic-guides">Guide e approfondimenti</SectionTitle>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {evergreen.slice(0, GUIDES_SIZE).map(({ post }) => (
                  <li key={post.id}>
                    <TjLink
                      href={articleHref(post)}
                      className="block px-4 py-3 transition-colors hover:bg-surface-overlay"
                    >
                      <span className="font-semibold text-foreground">{post.title}</span>
                      <time className="mt-1 block text-xs text-muted" dateTime={post.date}>
                        {formatDay(post.date)}
                      </time>
                    </TjLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {timeline.length > 0 && (
            <section aria-labelledby="tj-topic-timeline">
              <SectionTitle id="tj-topic-timeline">Cronologia</SectionTitle>
              <ol className="space-y-3 border-l border-border pl-4">
                {timeline.map(({ post }) => (
                  <li key={post.id}>
                    <time className="block text-xs uppercase tracking-wide text-muted" dateTime={post.date}>
                      {formatDay(post.date)}
                    </time>
                    <TjLink
                      href={articleHref(post)}
                      className="text-sm text-foreground hover:text-accent hover:underline"
                    >
                      {post.title}
                    </TjLink>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {compatibilityHref && (
            <section aria-labelledby="tj-topic-compat">
              <SectionTitle id="tj-topic-compat">Compatibilità</SectionTitle>
              <TjLink
                href={compatibilityHref}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-overlay px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                Scheda tecnica e compatibilità di {topic.name}
                <span aria-hidden>→</span>
              </TjLink>
            </section>
          )}

          {related.length > 0 && (
            <section aria-labelledby="tj-topic-related">
              <SectionTitle id="tj-topic-related">Argomenti collegati</SectionTitle>
              <ArticleTopics topics={related} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
