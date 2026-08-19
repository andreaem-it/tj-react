/**
 * Navigazione primaria del sito, in un unico posto.
 *
 * Serve a due consumatori con esigenze opposte: `components/NavBar` la
 * renderizza, e `lib/content/internalLinks` ha bisogno di sapere **cosa è già
 * raggiungibile da ogni pagina** per non spendere il budget di link interni su
 * destinazioni che il menu offre comunque.
 *
 * Modulo puro e privo di dipendenze: lo importa anche un Client Component.
 */

/** Voce del menu che punta a un archivio di categoria (con megamenu). */
export interface NavCategoryItem {
  label: string;
  /** Slug URL della categoria, cioè il path (`/apple`, `/ia`). */
  slug: string;
}

/** Voce del menu che punta a una pagina specifica. */
export interface NavLinkItem {
  label: string;
  href: string;
}

export type NavItem = NavCategoryItem | NavLinkItem;

/**
 * Categorie esposte nel menu principale.
 *
 * Attenzione: sono slug **URL**, non slug WordPress (`ia`, non
 * `intelligenza-artificiale`; `tech`, non `tecnologia`). La corrispondenza è in
 * `lib/api.ts`.
 */
export const PRIMARY_NAV_CATEGORIES: readonly NavCategoryItem[] = [
  { label: "Apple", slug: "apple" },
  { label: "Apps", slug: "apps" },
  { label: "Tech", slug: "tech" },
  { label: "Gaming", slug: "gaming" },
  { label: "Smart Home", slug: "smart-home" },
  { label: "IA", slug: "ia" },
];

/** Voci del menu principale, nell'ordine in cui compaiono. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: "Ultime Notizie", href: "/" },
  ...PRIMARY_NAV_CATEGORIES,
  { label: "Price Radar", href: "/price-radar" },
  { label: "Compatibilità", href: "/compatibility" },
];

/**
 * Percorsi raggiungibili dal menu su **qualsiasi** pagina del sito.
 *
 * L'internal linking automatico li esclude: un rimando nel corpo dell'articolo
 * verso `/apple`, che è già a due centimetri di distanza nell'intestazione, non
 * aggiunge una destinazione — aggiunge soltanto un link. Gli archivi *non* nel
 * menu (`/iphone`, `/mac`, `/ipad`, …) restano invece collegabili, perché lì il
 * rimando è l'unico modo per arrivarci dall'articolo.
 */
export const ALWAYS_REACHABLE_HREFS: readonly string[] = PRIMARY_NAV_CATEGORIES.map(
  (item) => `/${item.slug}`,
);
