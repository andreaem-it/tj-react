import type { ContentType } from "@/lib/content/types";

/**
 * Configurazione delle sezioni della home (§56).
 *
 * La home smette di essere un layout scritto nel JSX e diventa un elenco di
 * sezioni dichiarate: attivarne una, spostarla o cambiarne la dimensione è una
 * riga qui, non una modifica al componente.
 *
 * ## Quanto in là spingere l'astrazione
 *
 * Non c'è alcun registro di plugin né risoluzione dinamica dei componenti: il
 * `type` viene tradotto in JSX da uno `switch` esplicito. Con una decina di
 * sezioni, un sistema più generale costerebbe indirezione senza restituire
 * nulla — e il progetto chiede espressamente di non sovraingegnerizzare (§85).
 * Quello che serve davvero è che l'**ordine e le condizioni** stiano in un solo
 * posto leggibile, e questo lo ottiene.
 *
 * Regola valida per tutte: **una sezione senza dati non si renderizza**. Niente
 * intestazioni che annunciano il vuoto, niente contenitori che occupano spazio
 * in attesa di contenuto.
 */

export type HomeSectionType =
  /** Apertura: la storia principale più le secondarie. */
  | "hero"
  /** Flusso cronologico con caricamento progressivo. */
  | "latest"
  /** L'argomento del momento, scelto dal calore dei topic. */
  | "topicSpotlight"
  /** Contenuti evergreen: guide e confronti. */
  | "evergreen"
  /** Occasioni verificate dal price score. */
  | "priceRadar"
  /** Ingresso al database di compatibilità. */
  | "compatibility";

export interface HomeSectionConfig {
  id: string;
  type: HomeSectionType;
  /** Titolo mostrato. Assente per le sezioni che non ne hanno uno (hero). */
  title?: string;
  /** Sottotitolo esplicativo, dove il titolo da solo non basta. */
  subtitle?: string;
  /** Link "vedi tutto" a destra del titolo. */
  moreHref?: string;
  moreLabel?: string;
  enabled: boolean;
  limit?: number;
  /** Ordine crescente di comparsa. */
  priority: number;
  filters?: {
    /** Tipi editoriali ammessi nella sezione. */
    contentTypes?: readonly ContentType[];
  };
}

/**
 * Sezioni della home, nell'ordine in cui compaiono.
 *
 * L'ordine non è arbitrario: apertura e attualità per primi, perché sono il
 * motivo per cui si arriva su una testata; poi l'argomento del momento, che
 * porta dalla singola notizia alla storia; poi gli evergreen e gli strumenti,
 * che sono il motivo per **tornare**.
 */
export const HOME_SECTIONS: readonly HomeSectionConfig[] = [
  {
    id: "hero",
    type: "hero",
    enabled: true,
    limit: 4,
    priority: 10,
  },
  {
    id: "spotlight",
    type: "topicSpotlight",
    enabled: true,
    limit: 4,
    priority: 20,
  },
  {
    id: "latest",
    type: "latest",
    enabled: true,
    priority: 30,
  },
  {
    id: "evergreen",
    type: "evergreen",
    title: "Guide e confronti",
    subtitle: "Contenuti che restano utili anche fra sei mesi.",
    enabled: true,
    limit: 4,
    priority: 40,
    filters: { contentTypes: ["guide", "comparison", "deep-dive"] },
    // Non un nuovo archivio: `/guide` è la categoria WordPress reale da cui la
    // sezione stessa pesca il supplemento quando il pool di apertura non
    // basta (vedi EvergreenSection in app/page.tsx). Ogni altra sezione ha
    // un "vedi tutto" verso una pagina vera; questa no, ed era un vicolo
    // cieco — l'unica delle sei senza modo di vedere più di 4 elementi.
    moreHref: "/guide",
    moreLabel: "Tutte le guide",
  },
  {
    id: "price-radar",
    type: "priceRadar",
    enabled: true,
    limit: 4,
    moreHref: "/price-radar",
    moreLabel: "Tutti i prezzi monitorati",
    priority: 50,
  },
  {
    id: "compatibility",
    type: "compatibility",
    title: "Compatibilità Apple",
    subtitle:
      "Quale iPhone riceve quale versione di iOS, con le schede tecniche di ogni modello.",
    enabled: true,
    moreHref: "/compatibility",
    moreLabel: "Apri il database",
    priority: 60,
  },
];

/** Sezioni attive, già ordinate. */
export function enabledSections(
  sections: readonly HomeSectionConfig[] = HOME_SECTIONS,
): HomeSectionConfig[] {
  return sections.filter((section) => section.enabled).sort((a, b) => a.priority - b.priority);
}

/** Configurazione di una sezione, se attiva. */
export function sectionById(
  id: string,
  sections: readonly HomeSectionConfig[] = HOME_SECTIONS,
): HomeSectionConfig | undefined {
  return sections.find((section) => section.id === id && section.enabled);
}

/**
 * Sottoinsieme di ID sezione, filtrato sulle attive e ordinato per `priority`
 * (§10, §56) — usato dove il JSX non può iterare `HOME_SECTIONS` per intero
 * (perché ogni sezione ha una firma diversa: dati diversi, Suspense diverso),
 * ma l'ordine relativo fra un gruppo di sezioni deve comunque seguire la
 * configurazione, non l'ordine in cui capita di scriverle nel componente.
 *
 * Un ID assente da `candidateIds` o disabilitato semplicemente non compare
 * nel risultato: chi chiama itera solo ciò che deve mostrare.
 */
export function orderedSectionIds(
  candidateIds: readonly string[],
  sections: readonly HomeSectionConfig[] = HOME_SECTIONS,
): string[] {
  const candidates = new Set(candidateIds);
  return enabledSections(sections)
    .filter((section) => candidates.has(section.id))
    .map((section) => section.id);
}
