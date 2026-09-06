import { matchProductsToArticle, type ProductMatchReason } from "@/lib/content/products";
import type { Topic } from "@/lib/content/types";
import {
  analyzeProduct,
  loadPriceHistory,
  loadProductList,
  type RatedProduct,
} from "@/lib/priceRadar/productServer";

/**
 * Prodotti Price Radar da mostrare dentro un articolo (§13, §16).
 *
 * **Modulo server-only.**
 *
 * Trasforma un'affermazione — "è in offerta" — in un dato verificabile: prezzo
 * di oggi, media registrata, scarto, valutazione. È la differenza fra pubblicare
 * offerte affiliate e pubblicare informazione sui prezzi.
 *
 * Costo per articolo, quando non c'è alcuna corrispondenza (il caso più
 * frequente): **una sola richiesta**, l'elenco prodotti, condivisa via Data
 * Cache con la pagina Price Radar e con tutti gli altri articoli. Lo storico si
 * scarica solo per i prodotti effettivamente associati, al massimo due.
 */

export interface ArticleProduct extends RatedProduct {
  /** Come è stata stabilita l'associazione, per poterla spiegare al lettore. */
  reason: ProductMatchReason;
  /** Argomento condiviso, quando l'associazione è semantica. */
  topic?: Topic;
}

export interface LoadArticleProductsInput {
  /** HTML dell'articolo: vi si cercano eventuali link Amazon. */
  contentHtml?: string;
  /** Topic principali dell'articolo, da `enrichArticle`. */
  articleTopics: readonly Topic[];
  limit?: number;
}

export async function loadArticleProducts({
  contentHtml,
  articleTopics,
  limit = 2,
}: LoadArticleProductsInput): Promise<ArticleProduct[]> {
  // Se l'articolo non nomina nessun argomento acquistabile e non contiene link
  // Amazon, si esce prima ancora di interrogare il catalogo.
  const hasAsinCandidates = Boolean(contentHtml && contentHtml.includes("B0"));
  if (!hasAsinCandidates && articleTopics.length === 0) return [];

  const products = await loadProductList();
  if (products.length === 0) return [];

  const matches = matchProductsToArticle(
    products.filter((p) => p.title?.trim() && p.current_price != null),
    { contentHtml, articleTopics },
    limit,
  );
  if (matches.length === 0) return [];

  const now = Date.now();
  return Promise.all(
    matches.map(async ({ product, reason, topic }) => {
      const history = await loadPriceHistory(product.id);
      const { stats, rating } = analyzeProduct(product.current_price, history, now);
      return { product, stats, rating, reason, topic };
    }),
  );
}
