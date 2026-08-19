import { fetchSearchPosts, getCategoryUrlSlugFromWpSlug, type PostListItem } from "@/lib/api";
import { mentionsDeviceExactly } from "@/lib/compatibility/deviceMatch";
import type { Device } from "@/lib/compatibility/types";
import {
  analyzeProduct,
  loadPriceHistory,
  loadProductList,
  type RatedProduct,
} from "@/lib/priceRadar/productServer";

/**
 * Collegamenti fra una scheda di compatibilità e il resto del sito (§26).
 *
 * **Modulo server-only.**
 *
 * Il database di compatibilità è oggi un'isola: nessuna pagina porta dalla
 * scheda di un dispositivo agli articoli che ne parlano o al suo prezzo, benché
 * entrambi esistano in archivio. Questo modulo chiude il cerchio nella direzione
 * mancante — gli hub di argomento già linkavano le schede dalla prima fase.
 *
 * La precisione viene da `mentionsDeviceExactly`: la ricerca di WordPress porta
 * i candidati, il matcher decide, esattamente come per gli hub di argomento e
 * per i prodotti negli articoli.
 */

/** Articoli richiesti a monte: il matcher ne scarta una buona parte. */
const ARTICLE_FETCH_LIMIT = 24;
/** Articoli mostrati nella scheda. */
const ARTICLE_DISPLAY_LIMIT = 4;

export interface DeviceContextArticle {
  post: PostListItem;
  href: string;
}

export interface DeviceContext {
  articles: DeviceContextArticle[];
  /** Prodotto monitorato corrispondente, se il modello è nel catalogo. */
  product: RatedProduct | null;
}

export async function loadDeviceContext(device: Device): Promise<DeviceContext> {
  const [articles, product] = await Promise.all([
    loadDeviceArticles(device),
    loadDeviceProduct(device),
  ]);
  return { articles, product };
}

async function loadDeviceArticles(device: Device): Promise<DeviceContextArticle[]> {
  try {
    const { posts } = await fetchSearchPosts({
      query: device.name,
      perPage: ARTICLE_FETCH_LIMIT,
      page: 1,
    });
    return posts
      // Solo il titolo, non l'excerpt: un articolo che nomina il modello nel
      // titolo parla di quel modello, uno che lo cita nel sommario spesso lo usa
      // come termine di paragone.
      .filter((post) => mentionsDeviceExactly(post.title, device.name))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, ARTICLE_DISPLAY_LIMIT)
      .map((post) => ({
        post,
        href: `/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`,
      }));
  } catch (e) {
    // La scheda resta utile senza articoli correlati.
    console.error(`[Compatibility] articoli non disponibili per ${device.slug}:`, e);
    return [];
  }
}

async function loadDeviceProduct(device: Device): Promise<RatedProduct | null> {
  try {
    const products = await loadProductList();
    const match = products.find(
      (product) =>
        product.title?.trim() &&
        product.current_price != null &&
        mentionsDeviceExactly(product.title, device.name),
    );
    if (!match) return null;

    const history = await loadPriceHistory(match.id);
    const { stats, rating } = analyzeProduct(match.current_price, history, Date.now());
    return { product: match, stats, rating };
  } catch (e) {
    console.error(`[Compatibility] prezzo non disponibile per ${device.slug}:`, e);
    return null;
  }
}
