/**
 * Preferenze personali del lettore: argomenti seguiti, articoli salvati,
 * prodotti tenuti d'occhio (§24, §46).
 *
 * Modulo puro: trasformazioni su una struttura dati, senza toccare `localStorage`
 * né `window`. L'adattatore al browser sta in `lib/personal/usePersonal.ts`, così
 * questa logica è testabile con `node --test`.
 *
 * ## Perché nel browser e non in un account
 *
 * Il progetto è esplicito: gli account non sono una priorità, e prima vanno
 * costruiti **motivi reali per registrarsi**. Questo modulo costruisce quei
 * motivi. L'auth esistente in questo repository è solo per il pannello
 * amministrativo (`admin_session`), e un sistema utenti pubblico richiederebbe un
 * archivio utenti, verifica email, recupero password e gli obblighi che
 * discendono dal trattare dati personali — un progetto di backend, non di
 * frontend.
 *
 * Tenendo tutto nel browser il valore arriva subito e **non si raccoglie nessun
 * dato personale**: niente lascia il dispositivo, quindi non c'è nulla da
 * proteggere, esportare o cancellare su richiesta.
 *
 * ## Il limite, che va detto all'utente
 *
 * Le preferenze non seguono l'utente fra dispositivi e si perdono svuotando i
 * dati del browser. L'interfaccia lo dichiara: promettere una sincronizzazione
 * che non esiste sarebbe il modo più rapido di perdere la fiducia di chi si fida.
 * Il giorno in cui esisterà un account, questa struttura diventa il payload da
 * sincronizzare — non un sistema da rifare.
 */

/** Versione dello schema salvato. Cambiarla richiede una migrazione. */
export const PERSONAL_DATA_VERSION = 1;

/** Chiave in `localStorage`. Il prefisso evita collisioni con altri script. */
export const PERSONAL_STORAGE_KEY = "tj:personal:v1";

export interface FollowedTopic {
  slug: string;
  addedAt: number;
  /**
   * Ultimo istante in cui l'utente ha visto gli aggiornamenti dell'argomento.
   *
   * È il dato che rende utile il "seguire": senza, un elenco di argomenti è una
   * raccolta di segnalibri. Con, la pagina può dire *cosa è cambiato da quando
   * non guardi*, che è il motivo per tornare.
   */
  lastSeenAt: number;
}

export interface SavedArticle {
  id: number;
  path: string;
  title: string;
  savedAt: number;
}

export interface WatchedProduct {
  asin: string;
  title: string;
  /** Soglia sotto la quale il prezzo interessa; `null` = solo monitoraggio. */
  targetPrice: number | null;
  addedAt: number;
}

export interface PersonalData {
  version: number;
  topics: FollowedTopic[];
  articles: SavedArticle[];
  products: WatchedProduct[];
}

/**
 * Tetti per collezione.
 *
 * Non servono contro i limiti di `localStorage` — questi dati pesano qualche
 * kilobyte — ma contro la crescita illimitata su un dispositivo usato per anni.
 * Al superamento si scarta il più vecchio, che è la voce che l'utente ha meno
 * probabilità di rivolere.
 */
const LIMITS = { topics: 50, articles: 200, products: 100 } as const;

export function emptyPersonalData(): PersonalData {
  return { version: PERSONAL_DATA_VERSION, topics: [], articles: [], products: [] };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Legge i dati salvati, scartando tutto ciò che non è riconoscibile.
 *
 * Non lancia mai. I dati provengono da `localStorage`, che è modificabile da
 * chiunque abbia la console aperta e sopravvive agli aggiornamenti del sito: una
 * voce malformata deve costare quella voce, non l'intera funzionalità.
 */
export function parsePersonalData(raw: string | null | undefined): PersonalData {
  if (!nonEmptyString(raw)) return emptyPersonalData();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyPersonalData();
  }
  if (typeof parsed !== "object" || parsed === null) return emptyPersonalData();

  const source = parsed as Partial<PersonalData>;
  // Versione diversa da quella attesa: si riparte da zero invece di indovinare
  // la forma. Con una sola versione in circolazione non c'è nulla da migrare, e
  // il giorno in cui ce ne sarà una seconda questo è il punto in cui si scrive
  // la conversione.
  if (source.version !== PERSONAL_DATA_VERSION) return emptyPersonalData();

  const topics: FollowedTopic[] = Array.isArray(source.topics)
    ? source.topics
        .filter(
          (t): t is FollowedTopic =>
            typeof t === "object" && t !== null && nonEmptyString((t as FollowedTopic).slug),
        )
        .map((t) => ({
          slug: t.slug.trim(),
          addedAt: isFiniteNumber(t.addedAt) ? t.addedAt : 0,
          lastSeenAt: isFiniteNumber(t.lastSeenAt) ? t.lastSeenAt : 0,
        }))
    : [];

  const articles: SavedArticle[] = Array.isArray(source.articles)
    ? source.articles
        .filter(
          (a): a is SavedArticle =>
            typeof a === "object" &&
            a !== null &&
            isFiniteNumber((a as SavedArticle).id) &&
            nonEmptyString((a as SavedArticle).path),
        )
        .map((a) => ({
          id: a.id,
          path: a.path,
          title: nonEmptyString(a.title) ? a.title : a.path,
          savedAt: isFiniteNumber(a.savedAt) ? a.savedAt : 0,
        }))
    : [];

  const products: WatchedProduct[] = Array.isArray(source.products)
    ? source.products
        .filter(
          (p): p is WatchedProduct =>
            typeof p === "object" && p !== null && nonEmptyString((p as WatchedProduct).asin),
        )
        .map((p) => ({
          asin: p.asin.trim().toUpperCase(),
          title: nonEmptyString(p.title) ? p.title : p.asin,
          targetPrice:
            isFiniteNumber(p.targetPrice) && p.targetPrice > 0 ? p.targetPrice : null,
          addedAt: isFiniteNumber(p.addedAt) ? p.addedAt : 0,
        }))
    : [];

  return { version: PERSONAL_DATA_VERSION, topics, articles, products };
}

export function serializePersonalData(data: PersonalData): string {
  return JSON.stringify(data);
}

/** Tiene le `max` voci più recenti secondo `key`. */
function capBy<T>(items: T[], max: number, key: (item: T) => number): T[] {
  if (items.length <= max) return items;
  return [...items].sort((a, b) => key(b) - key(a)).slice(0, max);
}

// ---------------------------------------------------------------------------
// Argomenti seguiti
// ---------------------------------------------------------------------------

export function isFollowingTopic(data: PersonalData, slug: string): boolean {
  return data.topics.some((topic) => topic.slug === slug);
}

export function followTopic(data: PersonalData, slug: string, now: number): PersonalData {
  if (!nonEmptyString(slug) || isFollowingTopic(data, slug)) return data;
  const topics = capBy(
    [...data.topics, { slug, addedAt: now, lastSeenAt: now }],
    LIMITS.topics,
    (t) => t.addedAt,
  );
  return { ...data, topics };
}

export function unfollowTopic(data: PersonalData, slug: string): PersonalData {
  if (!isFollowingTopic(data, slug)) return data;
  return { ...data, topics: data.topics.filter((topic) => topic.slug !== slug) };
}

/**
 * Segna come visti gli aggiornamenti di un argomento.
 *
 * Va chiamata quando l'utente **vede** l'elenco delle novità, non quando apre un
 * articolo: aprire un pezzo non significa aver preso atto degli altri cinque.
 */
export function markTopicSeen(data: PersonalData, slug: string, now: number): PersonalData {
  if (!isFollowingTopic(data, slug)) return data;
  return {
    ...data,
    topics: data.topics.map((topic) =>
      topic.slug === slug ? { ...topic, lastSeenAt: now } : topic,
    ),
  };
}

// ---------------------------------------------------------------------------
// Articoli salvati
// ---------------------------------------------------------------------------

export function isArticleSaved(data: PersonalData, id: number): boolean {
  return data.articles.some((article) => article.id === id);
}

export function saveArticle(
  data: PersonalData,
  article: Omit<SavedArticle, "savedAt">,
  now: number,
): PersonalData {
  if (isArticleSaved(data, article.id)) return data;
  const articles = capBy(
    [{ ...article, savedAt: now }, ...data.articles],
    LIMITS.articles,
    (a) => a.savedAt,
  );
  return { ...data, articles };
}

export function unsaveArticle(data: PersonalData, id: number): PersonalData {
  if (!isArticleSaved(data, id)) return data;
  return { ...data, articles: data.articles.filter((article) => article.id !== id) };
}

// ---------------------------------------------------------------------------
// Prodotti tenuti d'occhio
// ---------------------------------------------------------------------------

export function findWatchedProduct(data: PersonalData, asin: string): WatchedProduct | undefined {
  const normalized = asin.trim().toUpperCase();
  return data.products.find((product) => product.asin === normalized);
}

export function watchProduct(
  data: PersonalData,
  product: Omit<WatchedProduct, "addedAt">,
  now: number,
): PersonalData {
  const asin = product.asin.trim().toUpperCase();
  if (!asin) return data;

  const target =
    isFiniteNumber(product.targetPrice) && product.targetPrice > 0 ? product.targetPrice : null;
  const existing = findWatchedProduct(data, asin);

  if (existing) {
    // Ri-osservare un prodotto già seguito aggiorna la soglia e conserva la data
    // originale: è la stessa intenzione, precisata.
    return {
      ...data,
      products: data.products.map((p) =>
        p.asin === asin ? { ...p, title: product.title, targetPrice: target } : p,
      ),
    };
  }

  const products = capBy(
    [{ asin, title: product.title, targetPrice: target, addedAt: now }, ...data.products],
    LIMITS.products,
    (p) => p.addedAt,
  );
  return { ...data, products };
}

export function unwatchProduct(data: PersonalData, asin: string): PersonalData {
  const normalized = asin.trim().toUpperCase();
  if (!findWatchedProduct(data, normalized)) return data;
  return { ...data, products: data.products.filter((product) => product.asin !== normalized) };
}

/** Vero se il prezzo corrente ha raggiunto la soglia indicata dall'utente. */
export function hasReachedTarget(product: WatchedProduct, currentPrice: number | null): boolean {
  if (product.targetPrice == null) return false;
  if (!isFiniteNumber(currentPrice) || currentPrice <= 0) return false;
  return currentPrice <= product.targetPrice;
}

/** Vero se non c'è nulla di salvato: l'interfaccia mostra lo stato iniziale. */
export function isEmpty(data: PersonalData): boolean {
  return data.topics.length === 0 && data.articles.length === 0 && data.products.length === 0;
}
