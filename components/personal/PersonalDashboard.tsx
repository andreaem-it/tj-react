"use client";

import { useEffect, useState } from "react";
import TjLink from "@/components/TjLink";
import {
  hasReachedTarget,
  isEmpty,
  markTopicSeen,
  unfollowTopic,
  unsaveArticle,
  unwatchProduct,
} from "@/lib/personal/store";
import { usePersonal } from "@/lib/personal/usePersonal";
import { formatEuro } from "@/lib/priceRadar/rating";

/**
 * Area personale: argomenti seguiti, articoli salvati, prezzi tenuti d'occhio.
 *
 * Interamente lato client, perché i dati stanno nel browser. Il server non li
 * vede e non li riceve — è il motivo per cui questa funzionalità esiste senza
 * account e senza raccogliere nulla.
 *
 * Le due chiamate di rete portano dati **pubblici** (ultimi articoli per
 * argomento, prezzi correnti): l'incrocio con le preferenze avviene qui, così la
 * cronologia di lettura di nessuno arriva al server.
 */

interface TopicUpdate {
  slug: string;
  name: string;
  href: string;
  articles: Array<{ id: number; title: string; date: string; path: string }>;
}

interface PriceRow {
  asin: string;
  current_price: number | null;
  currency: string;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Rome",
  });
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10" aria-labelledby={`sec-${title}`}>
      <h2 id={`sec-${title}`} className="text-lg font-bold text-foreground md:text-xl">
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function PersonalDashboard() {
  const { data, hydrated, update } = usePersonal();
  const [updates, setUpdates] = useState<TopicUpdate[]>([]);
  const [prices, setPrices] = useState<Map<string, PriceRow>>(new Map());

  const followedSlugs = data.topics.map((topic) => topic.slug).sort().join(",");

  useEffect(() => {
    // Nessun `setUpdates([])` qui: azzerare con `setState` dentro l'effetto
    // innesca un render a cascata, e non serve — la resa itera su `data.topics`,
    // quindi una voce rimasta per un argomento non più seguito non viene letta.
    if (!followedSlugs) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch(`/api/topics/updates?slugs=${encodeURIComponent(followedSlugs)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const json = (await res.json()) as { topics: TopicUpdate[] };
        setUpdates(json.topics ?? []);
      } catch {
        // Annullamento o rete assente: l'elenco degli argomenti resta comunque
        // navigabile, senza il conteggio delle novità.
      }
    })();
    return () => controller.abort();
  }, [followedSlugs]);

  const watchedCount = data.products.length;
  useEffect(() => {
    if (watchedCount === 0) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/price-radar/products?status=active", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const json = (await res.json()) as { products?: PriceRow[] };
        setPrices(new Map((json.products ?? []).map((p) => [p.asin?.toUpperCase(), p])));
      } catch {
        // Senza prezzi correnti la soglia non si valuta: si mostra comunque
        // l'elenco, senza affermare che sia stata raggiunta.
      }
    })();
    return () => controller.abort();
  }, [watchedCount]);

  if (!hydrated) {
    return <p className="py-10 text-muted">Lettura delle preferenze salvate…</p>;
  }

  if (isEmpty(data)) {
    return (
      <div className="rounded-lg border border-border bg-content-bg px-4 py-8 text-center">
        <p className="text-foreground">Non hai ancora salvato nulla.</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Segui un argomento da una pagina come{" "}
          <TjLink href="/topic/ios-27" className="text-accent hover:underline">
            iOS 27
          </TjLink>
          , salva un articolo con la stella, o tieni d&apos;occhio un prezzo su{" "}
          <TjLink href="/price-radar" className="text-accent hover:underline">
            Price Radar
          </TjLink>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      {data.topics.length > 0 && (
        <Section
          title="Argomenti che segui"
          hint="Il conteggio indica gli articoli pubblicati da quando hai guardato l'ultima volta."
        >
          <ul className="flex flex-col gap-3">
            {data.topics.map((followed) => {
              const info = updates.find((u) => u.slug === followed.slug);
              const fresh = (info?.articles ?? []).filter(
                (article) => new Date(article.date).getTime() > followed.lastSeenAt,
              );
              return (
                <li
                  key={followed.slug}
                  className="rounded-lg border border-border bg-content-bg p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <TjLink
                      href={info?.href ?? `/topic/${followed.slug}`}
                      className="font-semibold text-foreground hover:text-accent"
                    >
                      {info?.name ?? followed.slug}
                    </TjLink>
                    <span className="flex items-center gap-3 text-sm">
                      {fresh.length > 0 ? (
                        <span className="rounded bg-accent/20 px-2 py-0.5 font-semibold text-accent-text">
                          {fresh.length} {fresh.length === 1 ? "novità" : "novità"}
                        </span>
                      ) : (
                        <span className="text-muted">Nessuna novità</span>
                      )}
                      <button
                        type="button"
                        onClick={() => update((c) => unfollowTopic(c, followed.slug))}
                        className="inline-flex min-h-11 items-center px-2 text-muted hover:text-accent"
                      >
                        Smetti
                      </button>
                    </span>
                  </div>

                  {fresh.length > 0 && (
                    <>
                      <ul className="mt-3 space-y-2 border-l border-border pl-3">
                        {fresh.slice(0, 3).map((article) => (
                          <li key={article.id}>
                            <TjLink href={article.path} className="group block">
                              <time
                                className="block text-xs uppercase tracking-wide text-muted"
                                dateTime={article.date}
                              >
                                {formatDay(article.date)}
                              </time>
                              <span className="text-sm text-foreground group-hover:text-accent">
                                {article.title}
                              </span>
                            </TjLink>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => update((c) => markTopicSeen(c, followed.slug, Date.now()))}
                        className="mt-3 inline-flex min-h-11 items-center px-2 text-sm text-accent hover:underline"
                      >
                        Segna come letti
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {data.products.length > 0 && (
        <Section
          title="Prezzi che tieni d'occhio"
          hint="La soglia viene verificata quando apri questa pagina: il sito non invia notifiche."
        >
          <ul className="flex flex-col gap-3">
            {data.products.map((product) => {
              const row = prices.get(product.asin);
              const price = row?.current_price ?? null;
              const reached = hasReachedTarget(product, price);
              return (
                <li key={product.asin} className="rounded-lg border border-border bg-content-bg p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <TjLink
                      href={`/price-radar/${product.asin}`}
                      className="min-w-0 font-semibold text-foreground hover:text-accent"
                    >
                      {product.title}
                    </TjLink>
                    <button
                      type="button"
                      onClick={() => update((c) => unwatchProduct(c, product.asin))}
                      className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm text-muted hover:text-accent"
                    >
                      Rimuovi
                    </button>
                  </div>
                  <p className="mt-2 text-sm">
                    {price != null ? (
                      <span className="font-semibold text-foreground">
                        {formatEuro(price, row?.currency || "EUR")}
                      </span>
                    ) : (
                      <span className="text-muted">Prezzo non disponibile</span>
                    )}
                    {product.targetPrice != null && (
                      <span className="text-muted">
                        {" "}
                        · soglia {formatEuro(product.targetPrice)}
                      </span>
                    )}
                  </p>
                  {reached && (
                    <p className="mt-2 inline-flex rounded border border-emerald-600/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                      Sotto la tua soglia
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {data.articles.length > 0 && (
        <Section title="Articoli salvati">
          <ul className="divide-y divide-border rounded-lg border border-border">
            {data.articles.map((article) => (
              <li key={article.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <TjLink href={article.path} className="min-w-0 text-foreground hover:text-accent">
                  {article.title}
                </TjLink>
                <button
                  type="button"
                  onClick={() => update((c) => unsaveArticle(c, article.id))}
                  className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm text-muted hover:text-accent"
                >
                  Rimuovi
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
