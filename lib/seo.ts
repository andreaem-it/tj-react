/**
 * Sotto questa soglia un archivio di categoria non viene indicizzato né messo
 * in sitemap: è una pagina di puro elenco, troppo scarna per posizionarsi, che
 * consuma crawl budget sottraendolo agli articoli.
 *
 * Il valore non è arbitrario: la distribuzione degli articoli per categoria ha
 * uno stacco netto fra 9 e 16 (1, 1, 2, 4, 8, 9 → 16, 19, 21, 28, …). A 10
 * cadono le sei categorie residuali (stadia, xros, wi-fi, ios-games,
 * playstation, offerte) e nessuna di quelle vive; la soglia darebbe lo stesso
 * esito ovunque fra 10 e 15, quindi è stabile rispetto alla crescita.
 *
 * Un archivio che supera la soglia torna indicizzabile da solo al successivo
 * revalidate: non serve alcun intervento.
 */
export const MIN_POSTS_FOR_INDEXABLE_CATEGORY = 10;

const SITE_NAME = "TechJournal";
const TITLE_SEPARATOR = " | ";
/**
 * Budget del `<title>`. Google tronca su base pixel (~600px in SERP desktop),
 * che per un testo latino equivale a circa 65 caratteri: sotto questa soglia il
 * titolo viene mostrato intero.
 */
const MAX_TITLE_LENGTH = 65;

/**
 * Taglia sull'ultimo confine di parola.
 *
 * `withEllipsis` va usato per la description (dove il testo prosegue e i tre
 * puntini sono la convenzione), mai per il title: lì i puntini bruciano
 * caratteri indicizzabili e Google aggiunge comunque la propria ellissi quando
 * tronca.
 */
function truncateAtWord(value: string, maxLength: number, withEllipsis: boolean): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const budget = withEllipsis ? Math.max(0, maxLength - 1) : maxLength;
  const truncated = normalized.slice(0, budget).trimEnd();
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace >= Math.floor(maxLength * 0.6) ? truncated.slice(0, lastSpace) : truncated;
  if (withEllipsis) return `${cut}...`;
  // Senza i puntini, un taglio netto lascia in vista l'ultima parola: se è una
  // congiunzione o una preposizione il titolo resta sospeso ("...Center e").
  // Si rimuovono insieme alla punteggiatura penzolante.
  return cut.replace(/[\s,;:–—-]+$/, "").replace(TRAILING_STOPWORDS, "");
}

/** Parole vuote italiane che non devono chiudere un titolo troncato. */
const TRAILING_STOPWORDS =
  /\s+(?:e|ed|o|od|ma|se|che|di|del|dello|della|dei|degli|delle|da|dal|dalla|dai|a|al|allo|alla|ai|agli|alle|in|nel|nello|nella|nei|negli|nelle|con|col|su|sul|sullo|sulla|sui|sugli|sulle|per|tra|fra|il|lo|la|i|gli|le|un|uno|una|non|come|più)$/i;

export function brandedSeoTitle(title: string): string {
  const base = title.replace(/\s*\|\s*TechJournal\s*$/i, "").trim();
  const brandSuffix = `${TITLE_SEPARATOR}${SITE_NAME}`;

  // Caso migliore: headline intera + brand.
  if (base.length + brandSuffix.length <= MAX_TITLE_LENGTH) {
    return `${base}${brandSuffix}`;
  }
  // La headline da sola ci sta: si sacrifica il brand, non le keyword.
  //
  // Prima il brand era incondizionato e il titolo veniva compresso in
  // `MAX_TITLE_LENGTH - 14` caratteri, producendo in SERP titoli mutilati a
  // metà frase ("Apple apre ad Houston un Advanced... | TechJournal"). Il nome
  // del sito è già nel dominio e nel breadcrumb: vale meno dei 14 caratteri di
  // testo indicizzabile che costa.
  if (base.length <= MAX_TITLE_LENGTH) {
    return base;
  }
  return truncateAtWord(base, MAX_TITLE_LENGTH, false);
}

export function seoDescription(description: string, fallback: string): string {
  const value = (description || fallback).replace(/\s+/g, " ").trim();
  return truncateAtWord(value, 160, true);
}
