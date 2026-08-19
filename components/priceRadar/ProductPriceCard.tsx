import Image from "next/image";
import TjLink from "@/components/TjLink";
import PriceStatus from "@/components/priceRadar/PriceStatus";
import { BLUR_DATA_URL } from "@/lib/constants";
import type { RatedProduct } from "@/lib/priceRadar/productServer";

/**
 * Riquadro prodotto con prezzo e valutazione.
 *
 * Server Component riutilizzabile in tutti e tre i contesti previsti dalla fase:
 * dentro l'articolo, nella futura sezione "migliori occasioni" della home e
 * ovunque serva rimandare a una scheda prodotto. La valutazione mostrata è
 * sempre quella calcolata da `getPriceRating`, tramite `PriceStatus`: non esiste
 * un secondo posto dove un prezzo viene giudicato.
 *
 * Il link ad Amazon è `nofollow sponsored`: è un link affiliato, e dichiararlo
 * è dovuto sia verso i motori sia verso il lettore.
 */
export default function ProductPriceCard({
  entry,
  /** Riga sopra il titolo: spiega perché il prodotto compare qui. */
  eyebrow,
  className,
}: {
  entry: RatedProduct;
  eyebrow?: string;
  className?: string;
}) {
  const { product, rating, stats } = entry;
  const title = product.title?.trim() ?? "";
  const detailHref = `/price-radar/${product.asin}`;

  return (
    <article
      className={`flex gap-4 rounded-lg border border-border bg-content-bg p-4 ${className ?? ""}`}
    >
      {product.image_url && (
        <TjLink
          href={detailHref}
          // L'immagine è decorativa (`alt=""`) perché il titolo la segue: senza
          // questa etichetta il link resta però privo di nome accessibile, e chi
          // naviga per collegamenti sente solo "link".
          aria-label={title}
          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-white"
        >
          <Image
            src={product.image_url}
            alt=""
            fill
            className="object-contain p-1.5"
            sizes="96px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            loading="lazy"
          />
        </TjLink>
      )}

      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{eyebrow}</p>
        )}
        <h3 className="mt-0.5 line-clamp-2 font-semibold text-foreground">
          <TjLink href={detailHref} className="hover:text-accent">
            {title}
          </TjLink>
        </h3>

        <PriceStatus
          className="mt-2"
          currentPrice={product.current_price}
          currency={product.currency || "EUR"}
          rating={rating}
          stats={stats}
          variant="inline"
        />

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <TjLink href={detailHref} className="text-accent hover:underline">
            Vedi storico prezzi
          </TjLink>
          <a
            href={product.url}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="text-accent hover:underline"
          >
            Vedi l&apos;offerta ↗
          </a>
        </div>
      </div>
    </article>
  );
}
