"use client";

import { useId, useMemo, useState } from "react";
import type { ChartSeries } from "@/lib/priceRadar/productServer";
import {
  HISTORY_RANGE_LABEL,
  type HistoryRangeKey,
  type WindowStats,
} from "@/lib/priceRadar/history";
import { formatEuro } from "@/lib/priceRadar/rating";

/**
 * Grafico dello storico prezzi.
 *
 * ## Perché SVG scritto a mano e nessuna libreria
 *
 * `package.json` non contiene librerie di grafici, e questo caso non ne
 * giustifica una: la serie è una funzione a gradini con pochi punti (dopo la
 * compressione, sei sul prodotto con lo storico più lungo del catalogo). Le
 * librerie generaliste costano da qualche decina a oltre cento KB di JavaScript
 * per il lettore, portano il proprio modello di accessibilità e vanno mantenute
 * allineate a React — a fronte di una polilinea, una linea di riferimento e un
 * tooltip.
 *
 * ## Cosa il grafico non fa
 *
 * Non inventa punti. Le rilevazioni sono quelle reali; l'unica trasformazione è
 * la rimozione delle letture ripetute allo stesso prezzo, che non cambia la
 * curva. Gli intervalli senza rilevazioni sono tratteggiati: unire con una linea
 * piena due punti distanti due mesi affermerebbe che il prezzo è rimasto fermo,
 * cosa che non sappiamo.
 *
 * ## Accessibilità
 *
 * Il grafico non è l'unico modo per leggere l'andamento: sotto c'è la tabella
 * delle variazioni, navigabile da tastiera e da screen reader, e le metriche
 * numeriche stanno già nel riepilogo della pagina. La curva è marcata
 * `role="img"` con una descrizione testuale.
 */

const VIEW_WIDTH = 720;
const VIEW_HEIGHT = 260;
const PADDING = { top: 16, right: 12, bottom: 28, left: 52 };

const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right;
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom;

interface PriceHistoryChartProps {
  series: Partial<Record<HistoryRangeKey, ChartSeries>>;
  windows: Record<HistoryRangeKey, WindowStats>;
  availableRanges: HistoryRangeKey[];
  initialRange: HistoryRangeKey;
  currency: string;
  productTitle: string;
}

function formatDay(ms: number): string {
  return new Date(ms).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "Europe/Rome",
  });
}

function formatDayLong(ms: number): string {
  return new Date(ms).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Rome",
  });
}

export default function PriceHistoryChart({
  series,
  windows,
  availableRanges,
  initialRange,
  currency,
  productTitle,
}: PriceHistoryChartProps) {
  const [range, setRange] = useState<HistoryRangeKey>(initialRange);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();

  const active = series[range];
  const stats = windows[range];

  const geometry = useMemo(() => {
    if (!active || active.points.length < 2) return null;

    const points = active.points;
    const times = points.map((p) => p.t);
    const prices = points.map((p) => p.price);
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);
    const pMin = Math.min(...prices);
    const pMax = Math.max(...prices);

    // Serie perfettamente piatta: senza margine artificiale la linea finirebbe
    // sul bordo dell'area di disegno e sembrerebbe un errore di rendering.
    const span = pMax - pMin;
    const pad = span > 0 ? span * 0.12 : Math.max(pMax * 0.05, 1);
    const yMin = Math.max(0, pMin - pad);
    const yMax = pMax + pad;

    const x = (t: number) =>
      PADDING.left + (tMax === tMin ? PLOT_WIDTH / 2 : ((t - tMin) / (tMax - tMin)) * PLOT_WIDTH);
    const y = (price: number) =>
      PADDING.top + (yMax === yMin ? PLOT_HEIGHT / 2 : ((yMax - price) / (yMax - yMin)) * PLOT_HEIGHT);

    const isGap = (from: number, to: number) =>
      active.gaps.some((g) => g.from === from && g.to === to);

    const solid: string[] = [];
    const dashed: string[] = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      // Gradino: il prezzo resta quello di `a` fino alla rilevazione `b`, poi
      // salta. Una linea diagonale suggerirebbe una variazione graduale che non
      // è mai avvenuta.
      const horizontal = `M ${x(a.t)} ${y(a.price)} L ${x(b.t)} ${y(a.price)}`;
      const vertical = `M ${x(b.t)} ${y(a.price)} L ${x(b.t)} ${y(b.price)}`;
      (isGap(a.t, b.t) ? dashed : solid).push(horizontal);
      solid.push(vertical);
    }

    return {
      points,
      x,
      y,
      tMin,
      tMax,
      yMin,
      yMax,
      solidPath: solid.join(" "),
      dashedPath: dashed.join(" "),
      averageY: stats.average != null ? y(stats.average) : null,
    };
  }, [active, stats.average]);

  if (!active || !geometry) {
    return (
      <p className="rounded-lg border border-border bg-surface-overlay px-4 py-6 text-sm text-muted">
        Non ci sono ancora abbastanza rilevazioni per disegnare l&apos;andamento di questo periodo.
      </p>
    );
  }

  const { points, x, y, tMin, tMax, solidPath, dashedPath, averageY } = geometry;
  const activePoint = activeIndex != null ? points[activeIndex] : null;

  /**
   * "Variazioni" e non "rilevazioni": i punti disegnati sono quelli in cui il
   * prezzo cambia, non tutte le letture del tracker — che sul prodotto con lo
   * storico più lungo sono più di mille per una manciata di variazioni. Il
   * numero delle letture sta nel riepilogo della pagina, dove è la risposta a
   * una domanda diversa ("quanto è solido il dato").
   */
  const summary = `Andamento del prezzo di ${productTitle} su ${HISTORY_RANGE_LABEL[range].toLowerCase()}: ${points.length} variazioni registrate, da ${formatEuro(stats.min ?? 0, currency)} a ${formatEuro(stats.max ?? 0, currency)}.`;

  const selectByPointerPosition = (clientX: number, target: SVGSVGElement) => {
    const rect = target.getBoundingClientRect();
    if (rect.width === 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
    let nearest = 0;
    let best = Number.POSITIVE_INFINITY;
    points.forEach((point, index) => {
      const distance = Math.abs(x(point.t) - svgX);
      if (distance < best) {
        best = distance;
        nearest = index;
      }
    });
    setActiveIndex(nearest);
  };

  return (
    <div>
      {availableRanges.length > 1 && (
        <div role="group" aria-label="Periodo del grafico" className="mb-4 flex flex-wrap gap-2">
          {availableRanges.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setRange(key);
                setActiveIndex(null);
              }}
              aria-pressed={range === key}
              // `min-h-11` = 44px: sono i primi controlli tattili della pagina e
              // stanno in fila su schermi da 360px, dove un bersaglio più
              // piccolo si sbaglia. È la stessa altezza dei pulsanti di
              // dimensione testo negli articoli.
              className={`min-h-11 rounded-lg border px-3.5 py-2 text-sm transition-colors ${
                range === key
                  ? "border-accent bg-accent/15 font-semibold text-foreground"
                  : "border-border text-muted hover:bg-surface-overlay"
              }`}
            >
              {HISTORY_RANGE_LABEL[key]}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-border bg-content-bg p-2 md:p-4">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="h-auto w-full touch-pan-y"
          role="img"
          aria-label={summary}
          onPointerMove={(event) => selectByPointerPosition(event.clientX, event.currentTarget)}
          onPointerLeave={() => setActiveIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Riferimento della media: rende visibile a colpo d'occhio se il
              prezzo di oggi sta sopra o sotto l'abitudine del prodotto. */}
          {averageY != null && (
            <>
              <line
                x1={PADDING.left}
                y1={averageY}
                x2={VIEW_WIDTH - PADDING.right}
                y2={averageY}
                stroke="var(--muted)"
                strokeWidth={1}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
                opacity={0.6}
              />
              <text
                x={PADDING.left - 6}
                y={averageY + 4}
                textAnchor="end"
                className="fill-[var(--muted)] text-[11px]"
              >
                media
              </text>
            </>
          )}

          {dashedPath && (
            <path
              d={dashedPath}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={2}
              strokeDasharray="6 5"
              vectorEffect="non-scaling-stroke"
            />
          )}
          <path
            d={solidPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {points.map((point, index) => (
            <circle
              key={`${point.t}-${index}`}
              cx={x(point.t)}
              cy={y(point.price)}
              r={activeIndex === index ? 5 : 3}
              fill="var(--accent)"
              stroke="var(--content-bg)"
              strokeWidth={1.5}
            />
          ))}

          {activePoint && (
            <line
              x1={x(activePoint.t)}
              y1={PADDING.top}
              x2={x(activePoint.t)}
              y2={VIEW_HEIGHT - PADDING.bottom}
              stroke="var(--muted)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              opacity={0.5}
            />
          )}

          <text
            x={PADDING.left}
            y={VIEW_HEIGHT - 8}
            className="fill-[var(--muted)] text-[11px]"
          >
            {formatDay(tMin)}
          </text>
          <text
            x={VIEW_WIDTH - PADDING.right}
            y={VIEW_HEIGHT - 8}
            textAnchor="end"
            className="fill-[var(--muted)] text-[11px]"
          >
            {formatDay(tMax)}
          </text>
        </svg>

        {/* Il valore selezionato vive fuori dall'SVG: come testo normale eredita
            i font del sito, va a capo su schermi stretti ed è leggibile dagli
            screen reader senza costruire un tooltip accessibile a mano. */}
        <p aria-live="polite" className="mt-2 min-h-6 text-center text-sm text-foreground">
          {activePoint ? (
            <>
              <span className="font-semibold">{formatEuro(activePoint.price, currency)}</span>{" "}
              <span className="text-muted">il {formatDayLong(activePoint.t)}</span>
            </>
          ) : (
            <span className="text-muted">
              Tocca o passa sul grafico per leggere una rilevazione
            </span>
          )}
        </p>
      </div>

      {dashedPath && (
        <p className="mt-2 text-xs text-muted">
          Il tratteggio indica periodi senza rilevazioni: in quegli intervalli il prezzo non è stato
          osservato.
        </p>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-muted hover:text-foreground">
          Vedi le variazioni di prezzo in tabella
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{summary}</caption>
            <thead>
              <tr className="border-b border-border text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Data
                </th>
                <th scope="col" className="py-2 font-medium">
                  Prezzo
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={`${point.t}-row-${index}`} className="border-b border-border/60">
                  <td className="py-2 pr-4 text-muted">{formatDayLong(point.t)}</td>
                  <td className="py-2 font-medium text-foreground">
                    {formatEuro(point.price, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
