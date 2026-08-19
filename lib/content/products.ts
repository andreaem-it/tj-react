import { matchTopics, primaryTopics } from "@/lib/content/match";
import type { Topic, TopicKind } from "@/lib/content/types";

/**
 * Ponte fra articoli e prodotti monitorati (§15).
 *
 * Estende il grafo semantico della Fase 1 invece di affiancargli un secondo
 * sistema: il topic è già l'oggetto che dice "questo testo parla di iPhone 17",
 * e il titolo di un prodotto è a sua volta un testo. Passare entrambi dallo
 * stesso matcher significa che la relazione articolo↔prodotto è deterministica e
 * testabile con gli strumenti che esistono già.
 *
 * ```text
 * Articolo ──matchTopics──┐
 *                         ├──► topic in comune ──► Prodotto ──► Price Radar
 * Prodotto ──matchTopics──┘
 * ```
 *
 * Modulo puro: nessun I/O, importabile anche da un Client Component.
 */

/**
 * Tipi di topic che identificano un oggetto acquistabile.
 *
 * L'esclusione delle aziende è la regola che rende l'associazione sicura. Senza,
 * un articolo su una causa antitrust che nomina Apple mostrerebbe una custodia
 * per iPhone perché entrambi "parlano di Apple": vero, e completamente inutile.
 * `device-model` e `device-family` sono gli unici livelli a cui corrisponde
 * qualcosa che si compra.
 */
const PRODUCT_TOPIC_KINDS: ReadonlySet<TopicKind> = new Set<TopicKind>([
  "device-model",
  "device-family",
]);

/**
 * ASIN dentro un URL Amazon, nelle forme che WordPress produce davvero.
 *
 * `/dp/ASIN`, `/gp/product/ASIN` e il parametro `ASIN=`. Il match sull'host
 * evita di scambiare per identificativo un frammento di un altro URL.
 */
const AMAZON_ASIN_RE =
  /amazon\.[a-z.]{2,6}\/(?:[^\s"'<>]*?\/)?(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})/gi;
const AMAZON_ASIN_PARAM_RE = /[?&]asin=([A-Z0-9]{10})/gi;

/**
 * ASIN "nudo" nel testo.
 *
 * Il prefisso `B0` copre gli identificativi Amazon moderni ed è abbastanza
 * distintivo. Il rischio di falso positivo è comunque nullo per costruzione:
 * l'esito viene sempre intersecato con il catalogo monitorato, quindi una
 * sequenza casuale non corrisponde ad alcun prodotto e sparisce da sé.
 */
const BARE_ASIN_RE = /\b(B0[A-Z0-9]{8})\b/g;

/** Tutti gli identificativi Amazon citati nell'HTML di un articolo. */
export function extractAsins(html: string): Set<string> {
  const found = new Set<string>();
  if (!html) return found;
  for (const re of [AMAZON_ASIN_RE, AMAZON_ASIN_PARAM_RE, BARE_ASIN_RE]) {
    for (const match of html.matchAll(re)) {
      found.add(match[1].toUpperCase());
    }
  }
  return found;
}

/**
 * Topic di un prodotto, ricavati dal suo titolo.
 *
 * I titoli di catalogo sono quelli scaricati dal negozio, lunghi e pieni di
 * specifiche ("Fire TV Stick 4K Max di Amazon (Ultimo modello), Dispositivo per
 * lo streaming con supporto per Wi-Fi 6E"). Il matcher li tratta come qualsiasi
 * altro testo e ne estrae solo ciò che riconosce, ignorando il resto: è il
 * motivo per cui non serve normalizzare o ripulire i titoli a mano.
 */
/**
 * Marcatori dopo i quali il titolo elenca ciò con cui il prodotto **funziona**,
 * non ciò che il prodotto **è**.
 *
 * I titoli di catalogo Amazon terminano quasi sempre con l'elenco delle
 * compatibilità, e senza tagliarli il matcher legge quei nomi come se fossero il
 * prodotto. Verificato in produzione: un articolo su iPhone 18 Pro mostrava
 * "Anker Caricatore USB C 47 W, caricatore 523 (Nano 3), compatibile con iPhone
 * 17" perché il titolo nomina iPhone 17 fra le compatibilità.
 */
const COMPATIBILITY_MARKERS =
  /[,;–—-]?\s*\b(?:compatibil[ei]\s+con|compatible\s+with|adatt[oi]\s+(?:a|per)|progettat[oi]\s+per|studiat[oi]\s+per|per\s+(?=iPhone|iPad|iMac|MacBook|Mac\b|AirPods|Apple\s|Watch\b)|for\s+(?=iPhone|iPad|Mac|AirPods))/i;

/**
 * Tiene del titolo solo la parte che descrive il prodotto.
 *
 * Il taglio è volutamente severo: "Custodia per iPhone 15" si riduce a
 * "Custodia" e quindi non si associa ad alcun argomento. È la scelta giusta —
 * quel prodotto è una custodia, non un iPhone, e mostrarlo sotto un articolo su
 * iPhone 15 sarebbe un accostamento pubblicitario, non informativo. Perdiamo
 * copertura sugli accessori e guadagniamo che ciò che compare è sempre il
 * prodotto di cui l'articolo parla.
 */
export function describedProductPart(title: string): string {
  const match = COMPATIBILITY_MARKERS.exec(title);
  return match ? title.slice(0, match.index).trim() : title;
}

export function productTopics(title: string | null | undefined): Topic[] {
  const text = describedProductPart(title?.trim() ?? "");
  if (!text) return [];
  // `primaryTopics` toglie le generalizzazioni: un "iPhone 17 Pro" colpisce sia
  // `iphone-17` sia `iphone`, ma è un iPhone 17, e tenere anche la famiglia lo
  // renderebbe associabile a qualunque articolo che parli genericamente di
  // iPhone. Dove invece non esiste un topic più specifico — gli AirPods non
  // hanno una voce per generazione — resta la famiglia, che lì è il livello
  // giusto.
  //
  // Il limite è alzato rispetto al default perché i titoli di catalogo nominano
  // molte entità: con quattro posti, marca e accessori compatibili potrebbero
  // escludere proprio il modello.
  const PRODUCT_TOPIC_LIMIT = 8;
  return primaryTopics(matchTopics({ title: text }), PRODUCT_TOPIC_LIMIT).filter((topic) =>
    PRODUCT_TOPIC_KINDS.has(topic.kind),
  );
}

/** Prodotto nella forma minima richiesta dall'associazione. */
export interface MatchableProduct {
  id: number;
  asin: string;
  title: string | null;
}

/** Come è stato stabilito il collegamento: serve a spiegarlo e a ordinarlo. */
export type ProductMatchReason = "asin" | "topic";

export interface ProductMatch<T extends MatchableProduct> {
  product: T;
  reason: ProductMatchReason;
  /** Topic condiviso, presente solo quando l'associazione è semantica. */
  topic?: Topic;
}

export interface MatchProductsInput {
  /** HTML dell'articolo, dove cercare eventuali link Amazon. */
  contentHtml?: string;
  /** Topic principali dell'articolo, già calcolati da `enrichArticle`. */
  articleTopics: readonly Topic[];
}

/**
 * Prodotti da mostrare accanto a un articolo, dal collegamento più certo al meno.
 *
 * Due segnali soltanto, in ordine di forza:
 *
 * 1. **ASIN citato nell'articolo.** È un'identità, non una somiglianza: se il
 *    pezzo linka quel prodotto su Amazon, è quel prodotto. Zero falsi positivi.
 * 2. **Topic specifico condiviso.** Richiede che lo stesso `device-model` o
 *    `device-family` emerga sia dal testo dell'articolo sia dal titolo del
 *    prodotto.
 *
 * Non c'è alcun confronto per somiglianza fra stringhe. `title.includes(nome)`
 * su titoli di catalogo — che contengono marca, modello, capacità, colore e
 * spesso il nome di tre accessori compatibili — genererebbe associazioni
 * sbagliate proprio sugli articoli più letti, che sono quelli sui prodotti più
 * citati.
 *
 * Restituisce al massimo `limit` prodotti: il riquadro nell'articolo è un
 * rimando, non un catalogo.
 */
export function matchProductsToArticle<T extends MatchableProduct>(
  products: readonly T[],
  { contentHtml, articleTopics }: MatchProductsInput,
  limit = 2,
): Array<ProductMatch<T>> {
  if (products.length === 0 || limit <= 0) return [];

  const matches: Array<ProductMatch<T>> = [];
  const used = new Set<number>();

  const asins = contentHtml ? extractAsins(contentHtml) : new Set<string>();
  if (asins.size > 0) {
    for (const product of products) {
      if (!product.asin || !asins.has(product.asin.toUpperCase())) continue;
      matches.push({ product, reason: "asin" });
      used.add(product.id);
    }
  }

  const wanted = new Map(
    articleTopics
      .filter((topic) => PRODUCT_TOPIC_KINDS.has(topic.kind))
      .map((topic) => [topic.slug, topic]),
  );

  if (wanted.size > 0) {
    for (const product of products) {
      if (used.has(product.id)) continue;
      for (const topic of productTopics(product.title)) {
        const shared = wanted.get(topic.slug);
        if (!shared) continue;
        matches.push({ product, reason: "topic", topic: shared });
        used.add(product.id);
        break;
      }
    }
  }

  // L'ASIN precede sempre il topic: un prodotto esplicitamente linkato
  // nell'articolo è più pertinente di uno dedotto dall'argomento.
  return matches
    .sort((a, b) => (a.reason === b.reason ? 0 : a.reason === "asin" ? -1 : 1))
    .slice(0, limit);
}
