import {
  fetchCategories,
  fetchSearchPosts,
  getCategoryUrlSlug,
  getCategoryUrlSlugFromWpSlug,
} from "@/lib/api";
import {
  COMPATIBILITY_LIST_REVALIDATE_S,
  fetchCompatibilityDevices,
  fetchCompatibilityOsList,
} from "@/lib/compatibility/serverApi";
import { TOPICS, topicHref } from "@/lib/content/topics";
import { loadProductList } from "@/lib/priceRadar/productServer";
import { formatEuro } from "@/lib/priceRadar/rating";
import type { SearchEntry } from "@/lib/search/types";

/**
 * Costruzione dell'indice di ricerca dai quattro archivi.
 *
 * **Modulo server-only**: importa il data layer.
 *
 * Il costo è di tre richieste — dispositivi, sistemi operativi, prodotti — tutte
 * già presenti nella Data Cache perché le usano anche home, hub e Price Radar.
 * Gli argomenti non costano nulla: il registry è in bundle. Le categorie
 * arrivano dalla cache lunga di `fetchCategories`.
 */

/** Etichette dei tipi di dispositivo, per il sottotitolo del risultato. */
const DEVICE_TYPE_LABEL: Record<string, string> = {
  iphone: "iPhone",
  ipad: "iPad",
  mac: "Mac",
};

/**
 * Argomenti ed entità del registry.
 *
 * Gli alias diventano `keywords`, quindi la ricerca eredita gratuitamente tutto
 * il lavoro di normalizzazione della prima fase: chi cerca "xrOS" trova
 * visionOS, chi cerca "Cupertino" trova Apple.
 */
export function topicEntries(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const topic of TOPICS) {
    const href = topicHref(topic);
    if (!href) continue;
    entries.push({
      kind: "topic",
      id: topic.slug,
      title: topic.name,
      subtitle: topic.description,
      href,
      keywords: topic.aliases.map((alias) => (typeof alias === "string" ? alias : alias.text)),
    });
  }
  return entries;
}

/**
 * Sezioni del sito.
 *
 * Piccola e scritta a mano perché sono pagine, non dati: chi cerca
 * "compatibilità" o "price radar" sta cercando una sezione, e prima non la
 * trovava — la ricerca conosceva i contenuti ma non il sito che li ospita.
 *
 * `keywords` copre le forme senza accento e i sinonimi d'uso: la
 * normalizzazione toglie i diacritici, ma non sa che "offerte" porta a Price
 * Radar.
 */
const SECTION_ENTRIES: readonly SearchEntry[] = [
  {
    kind: "section",
    id: "section-price-radar",
    title: "Price Radar",
    subtitle: "Prezzi monitorati, storico e valutazione",
    href: "/price-radar",
    keywords: ["prezzi", "offerte", "sconti", "amazon"],
  },
  {
    kind: "section",
    id: "section-compatibility",
    title: "Compatibilità Apple",
    subtitle: "Quale dispositivo riceve quale versione di iOS",
    href: "/compatibility",
    keywords: ["compatibilita", "aggiornamenti", "supporto", "database"],
  },
  {
    kind: "section",
    id: "section-topics",
    title: "Argomenti",
    subtitle: "Tutti gli argomenti seguiti da TechJournal",
    href: "/topic",
    keywords: ["topic", "speciali", "hub"],
  },
];

export async function categoryEntries(): Promise<SearchEntry[]> {
  const categories = await fetchCategories().catch(() => []);
  return categories.map((category) => ({
    kind: "category" as const,
    id: String(category.id),
    title: category.name,
    subtitle: "Archivio della categoria",
    href: `/${getCategoryUrlSlug(category)}`,
  }));
}

export async function compatibilityEntries(): Promise<SearchEntry[]> {
  const policy = { revalidate: COMPATIBILITY_LIST_REVALIDATE_S } as const;
  const [devices, osList] = await Promise.all([
    fetchCompatibilityDevices(undefined, policy).catch(() => []),
    fetchCompatibilityOsList(policy).catch(() => []),
  ]);

  const deviceEntries: SearchEntry[] = devices.map((device) => ({
    kind: "device",
    id: device.slug,
    title: device.name,
    subtitle: [DEVICE_TYPE_LABEL[device.type] ?? device.type, device.chipset, device.releaseYear]
      .filter(Boolean)
      .join(" · "),
    href: `/compatibility/device/${device.slug}`,
    badge: device.releaseYear != null ? String(device.releaseYear) : undefined,
  }));

  const osEntries: SearchEntry[] = osList.map((os) => ({
    kind: "os",
    id: os.slug,
    title: os.name,
    subtitle: "Dispositivi compatibili",
    href: `/compatibility/os/${os.slug}`,
    badge: os.releaseYear != null ? String(os.releaseYear) : undefined,
  }));

  return [...deviceEntries, ...osEntries];
}

/**
 * Prodotti monitorati.
 *
 * Entrano solo quelli con un titolo: 51 su 94 arrivano senza dall'ingestion, e
 * un risultato intitolato "Prodotto B0XXXXXXXX" non è cercabile né utile.
 */
export async function productEntries(): Promise<SearchEntry[]> {
  const products = await loadProductList().catch(() => []);
  return products
    .filter((product) => product.title?.trim() && product.asin)
    .map((product) => ({
      kind: "product" as const,
      id: product.asin,
      title: product.title!.trim(),
      subtitle: [product.brand, product.category].filter(Boolean).join(" · ") || "Prezzo monitorato",
      href: `/price-radar/${product.asin}`,
      badge:
        product.current_price != null
          ? formatEuro(product.current_price, product.currency || "EUR")
          : undefined,
    }));
}

/**
 * Indice locale: tutto tranne gli articoli.
 *
 * Gli articoli restano fuori perché sono migliaia e vanno cercati dove stanno,
 * con la ricerca di WordPress. Qui c'è ciò che è abbastanza piccolo da poter
 * essere confrontato per intero a ogni query — poche centinaia di voci — e che
 * per questo dà risposte precise invece che approssimate.
 */
export async function buildLocalIndex(): Promise<SearchEntry[]> {
  const [categories, compatibility, products] = await Promise.all([
    categoryEntries(),
    compatibilityEntries(),
    productEntries(),
  ]);

  const entries = [
    ...SECTION_ENTRIES,
    ...topicEntries(),
    ...compatibility,
    ...products,
    ...categories,
  ];

  // Argomenti e categorie possono puntare allo stesso archivio (`/apple` è sia
  // la categoria Apple sia la destinazione dell'entità Apple): si tiene la prima
  // occorrenza, cioè l'argomento, che porta con sé alias e descrizione.
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.href)) return false;
    seen.add(entry.href);
    return true;
  });
}

/** Articoli pertinenti, dalla ricerca WordPress. */
export async function articleEntries(
  query: string,
  limit: number,
): Promise<{ entries: SearchEntry[]; unavailable: boolean }> {
  try {
    const { posts } = await fetchSearchPosts({ query, perPage: limit, page: 1 });
    return {
      entries: posts.map((post) => ({
        kind: "article" as const,
        id: String(post.id),
        title: post.title,
        subtitle: post.categoryName,
        href: `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`,
      })),
      unavailable: false,
    };
  } catch (e) {
    // La ricerca deve restare utile anche senza articoli: argomenti, schede e
    // prodotti sono già una risposta.
    console.error("[Search] ricerca articoli non disponibile:", e);
    return { entries: [], unavailable: true };
  }
}
