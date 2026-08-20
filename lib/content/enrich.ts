import { sanitizeRichHtml } from "@/lib/sanitizeRichHtml";
import {
  classifyContentType,
  classifyReliability,
  readingMinutes,
} from "@/lib/content/classify";
import { extractFaq } from "@/lib/content/faq";
import { injectInternalLinks } from "@/lib/content/internalLinks";
import { matchTopics, primaryTopics } from "@/lib/content/match";
import { extractSources } from "@/lib/content/sources";
import { buildToc } from "@/lib/content/toc";
import { countWords, htmlToText } from "@/lib/content/text";
import type { ArticleEnrichment, ContentType, Reliability } from "@/lib/content/types";
import { ALWAYS_REACHABLE_HREFS } from "@/lib/siteNav";

/**
 * Arricchimento completo di un articolo: unico punto di ingresso per la pagina
 * articolo.
 *
 * **Modulo server-only.** È l'unico file di `lib/content/*` che importa
 * `sanitize-html`; tutti gli altri sono puri e importabili anche da un Client
 * Component. Il confine è voluto: `sanitize-html` pesa, e finché stava dentro
 * `ArticleBody` (`"use client"`) veniva spedito al browser di ogni lettore per
 * ri-sanificare, a ogni idratazione, HTML che il server aveva già sanificato.
 *
 * L'ordine delle trasformazioni non è arbitrario:
 *
 * 1. **sanitizzazione**, prima di tutto — le fasi successive scrivono nell'HTML
 *    e devono lavorare su un albero di cui conosciamo i tag ammessi;
 * 2. **ancore degli heading**, prima dei link interni, così l'iniezione dei link
 *    vede gli heading già completi e li salta come contesto vietato;
 * 3. **link interni**, per ultimi, quando la struttura non cambia più.
 *
 * Il risultato è cacheabile: dipende solo dal contenuto in ingresso e dal
 * registry, quindi vive nella cache di pagina di Next senza ulteriore
 * infrastruttura.
 */

export interface EnrichArticleInput {
  title: string;
  excerpt?: string;
  /** HTML grezzo dell'articolo, così come arriva da WordPress. */
  content: string;
  /** Slug WordPress della categoria. */
  categorySlug?: string;
  /**
   * Percorso dell'archivio di categoria dell'articolo (`/apple`, `/ia`, …).
   *
   * Escluso dall'internal linking: la pagina lo linka già nell'occhiello e nel
   * breadcrumb.
   */
  categoryHref?: string;
}

export function enrichArticle(input: EnrichArticleInput): ArticleEnrichment {
  const sanitized = sanitizeRichHtml(input.content ?? "");
  const contentText = htmlToText(sanitized);
  const wordCount = countWords(contentText);

  const matches = matchTopics({
    title: input.title,
    excerpt: input.excerpt,
    contentText,
  });
  const entities = matches.map((match) => match.topic);

  const { entries: toc, html: withAnchors } = buildToc(sanitized);
  const { html: withLinks } = injectInternalLinks(withAnchors, entities, {
    // L'archivio dell'articolo (linkato da occhiello e breadcrumb) più tutti
    // quelli del menu principale, presenti su ogni pagina del sito.
    skipHrefs: [
      ...(input.categoryHref ? [input.categoryHref] : []),
      ...ALWAYS_REACHABLE_HREFS,
    ],
  });

  return {
    contentType: classifyContentType({
      title: input.title,
      categorySlug: input.categorySlug,
    }),
    reliability: classifyReliability({ title: input.title, excerpt: input.excerpt }),
    topics: primaryTopics(matches),
    entities,
    readingMinutes: readingMinutes(wordCount),
    wordCount,
    toc,
    // Dal contenuto già sanificato ma prima dei link interni: sono link che
    // l'articolo conteneva già, non vanno confusi con quelli appena iniettati.
    sources: extractSources(sanitized),
    // Dal risultato finale: gli `id` degli heading devono coincidere con
    // quelli effettivamente presenti nell'HTML renderizzato.
    faq: extractFaq(withLinks, toc),
    safeHtml: withLinks,
  };
}

export interface ArticleTopicsInput {
  title: string;
  excerpt?: string;
  /** HTML grezzo dell'articolo, così come arriva da WordPress. */
  content: string;
  categorySlug?: string;
}

/**
 * Solo la classificazione — niente TOC, niente link interni — per chi deve
 * sapere di cosa parla un articolo senza renderlo. Oggi serve al webhook di
 * pubblicazione per targettizzare le notifiche push per argomento: usa lo
 * stesso `matchTopics` su titolo + estratto + **contenuto completo**, non la
 * versione più leggera di `classifyPost` (solo titolo + estratto, pensata per
 * classificare liste intere senza scaricare ogni corpo articolo). Qui il
 * corpo c'è già — il webhook lo ha appena scaricato per l'invalidazione della
 * cache — quindi non c'è motivo di accontentarsi del match più povero.
 */
export function classifyArticleTopics(input: ArticleTopicsInput): {
  contentType: ContentType;
  reliability: Reliability;
  topicSlugs: string[];
} {
  const sanitized = sanitizeRichHtml(input.content ?? "");
  const contentText = htmlToText(sanitized);
  const matches = matchTopics({
    title: input.title,
    excerpt: input.excerpt,
    contentText,
  });
  return {
    contentType: classifyContentType({ title: input.title, categorySlug: input.categorySlug }),
    reliability: classifyReliability({ title: input.title, excerpt: input.excerpt }),
    topicSlugs: primaryTopics(matches).map((topic) => topic.slug),
  };
}
