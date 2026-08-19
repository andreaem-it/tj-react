import ProductPriceCard from "@/components/priceRadar/ProductPriceCard";
import TjLink from "@/components/TjLink";
import { getBestCurrentDeals } from "@/lib/priceRadar/productServer";

/**
 * Le migliori occasioni del momento, ordinate per price score (§29).
 *
 * Server Component autonomo: si carica i propri dati e **non renderizza nulla**
 * se nessun prodotto supera la verifica. È il comportamento voluto — al momento
 * della scrittura, sul catalogo reale, quasi tutti i prodotti hanno troppo poco
 * storico per dichiararli convenienti — e per questo il chiamante non deve
 * predisporre alcun contenitore né titolo: lo porta con sé.
 *
 * Pensato per essere montato anche in home nella fase successiva senza
 * modifiche: prende solo `limit` e `className`.
 *
 * La differenza con la griglia sottostante di `/price-radar` non è estetica. Lì
 * l'ordine è lo sconto dichiarato dal negozio; qui entra solo ciò che risulta
 * conveniente rispetto al proprio storico, con abbastanza rilevazioni da poterlo
 * affermare.
 */
export default async function BestDealsSection({
  limit = 4,
  className,
  /**
   * Rimando finale, reso solo se c'è almeno un'occasione.
   *
   * Vive qui e non nel chiamante perché solo questo componente sa se ha
   * qualcosa da mostrare: gestito fuori, il link resterebbe orfano ogni volta
   * che la verifica non promuove nessun prodotto.
   */
  moreHref,
  moreLabel,
}: {
  limit?: number;
  className?: string;
  moreHref?: string;
  moreLabel?: string;
}) {
  const deals = await getBestCurrentDeals(limit).catch(() => []);
  if (deals.length === 0) return null;

  return (
    <section className={className} aria-labelledby="tj-best-deals">
      <div className="mb-4">
        <h2 id="tj-best-deals" className="text-lg font-bold text-foreground md:text-xl">
          Le occasioni verificate
        </h2>
        <p className="mt-1 text-sm text-muted">
          Prodotti il cui prezzo di oggi è basso rispetto al loro storico, non rispetto al listino
          dichiarato.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {deals.map((entry) => (
          <ProductPriceCard key={entry.product.id} entry={entry} />
        ))}
      </div>
      {moreHref && (
        <p className="mt-3 text-sm">
          <TjLink href={moreHref} className="text-accent hover:underline">
            {moreLabel ?? "Vedi tutto"} →
          </TjLink>
        </p>
      )}
    </section>
  );
}
