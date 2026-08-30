"use client";

import Image from "next/image";
import Link from "next/link";
import type { TechRadarOffer } from "@/lib/techradar";
import { BLUR_DATA_URL } from "@/lib/constants";
import { postPriceRadarProductClick } from "@/lib/tjApiClient";

interface PriceRadarCardProps {
  offer: TechRadarOffer;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatLastPriceUpdate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Domini Amazon supportati da next/image */
const ALLOWED_IMAGE_HOSTS = ["m.media-amazon.com", "images-na.ssl-images-amazon.com", "images-eu.ssl-images-amazon.com"];

function normalizeImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(trimmed)) return `https://${trimmed}`;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice("http://".length)}`;
  return trimmed;
}

function isAllowedNextImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    return ALLOWED_IMAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export default function PriceRadarCard({ offer }: PriceRadarCardProps) {
  const discountPercent = Math.round(offer.discount_percent);
  const isSignificantDiscount = discountPercent >= 15;
  const imageUrl = offer.image ? normalizeImageUrl(offer.image) : null;
  const useNextImage = Boolean(imageUrl && isAllowedNextImageUrl(imageUrl));
  const lastPriceUpdate = formatLastPriceUpdate(offer.created_at);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-border bg-content-bg shadow-card transition-all duration-300 md:hover:border-accent/40 md:hover:shadow-card-raised">
      <div className="relative aspect-square bg-sidebar-bg overflow-hidden">
        {imageUrl ? (
          useNextImage ? (
            <Image
              src={imageUrl}
              alt={offer.title}
              fill
              className="object-contain p-4 md:group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={offer.title}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain p-4 md:group-hover:scale-105 transition-transform duration-300"
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
        )}
        <div
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg font-bold text-sm shadow-md ${
            isSignificantDiscount ? "bg-red-500/90 text-white" : "bg-emerald-500/90 text-white"
          }`}
        >
          -{discountPercent}%
        </div>
      </div>

      <div className="flex-1 flex flex-col p-4">
        <h2 className="text-foreground font-semibold text-base line-clamp-3 mb-3 group-hover:text-accent transition-colors min-h-15">
          {offer.title}
        </h2>

        <div className="space-y-1 mb-4">
          {/*
            Il campo si chiama `previous_avg_price` ma trasporta `max_price_30d`
            (vedi `mapProductsToOffers`): è il prezzo **più alto** degli ultimi
            trenta giorni, non la media. Etichettarlo "prezzo medio" e barrarlo
            gonfiava lo sconto percepito, ed è il confronto meno favorevole al
            lettore fra quelli possibili. Qui si dichiara per quello che è; la
            media vera, ponderata sul tempo, sta nella pagina prodotto.
          */}
          <p className="text-muted text-sm">
            Massimo 30 giorni:{" "}
            <span className="line-through">{formatPrice(offer.previous_avg_price)}</span>
          </p>
          <p className="text-foreground font-bold text-lg">
            Prezzo attuale: <span className="text-accent">{formatPrice(offer.price)}</span>
          </p>
          {lastPriceUpdate && (
            <p className="text-muted text-[10px] leading-tight">
              Ultimo aggiornamento prezzo: {lastPriceUpdate}
            </p>
          )}
        </div>

        {offer.asin && (
          <Link
            href={`/price-radar/${offer.asin}`}
            prefetch={false}
            className="relative z-20 mb-2 flex min-h-11 items-center justify-center gap-1 rounded text-sm text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Storico prezzi e valutazione
          </Link>
        )}

        <a
          href={offer.url}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="relative z-20 mt-auto flex min-h-11 items-center justify-center gap-2 w-full py-3 px-4 bg-accent hover:bg-accent/90 text-foreground font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={(e) => {
            e.stopPropagation();
            if (offer.productId != null) {
              postPriceRadarProductClick(offer.productId);
            }
          }}
        >
          Scopri su Amazon (link affiliato)
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </article>
  );
}
