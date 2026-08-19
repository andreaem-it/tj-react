import TjLink from "@/components/TjLink";
import type { BreakingEntry } from "@/lib/home/overrides";

/**
 * Barra delle notizie in evidenza (§12).
 *
 * Server Component senza stato: la scadenza è già stata valutata a monte da
 * `activeBreaking()`, quindi qui non c'è alcun timer da far girare nel browser.
 * Alla rigenerazione successiva della pagina la barra sparisce da sola.
 *
 * Compare solo quando c'è qualcosa. Una barra sempre accesa è indistinguibile da
 * un elemento di layout, e smette di essere letta esattamente quando servirebbe.
 */

const KIND_STYLE = {
  breaking: "bg-red-600 text-white",
  // Il rosso resta riservato all'urgenza: una diretta è un contesto, non
  // un'emergenza.
  live: "bg-accent text-gray-900",
} as const;

const KIND_LABEL = {
  breaking: "Breaking",
  live: "Live",
} as const;

export default function BreakingBar({ entry }: { entry: BreakingEntry | null }) {
  if (!entry) return null;

  return (
    <aside
      className="mb-6 overflow-hidden rounded-lg border border-border bg-content-bg"
      aria-label={KIND_LABEL[entry.kind]}
    >
      <TjLink href={entry.href} className="group flex items-stretch gap-0">
        <span
          className={`flex shrink-0 items-center px-3 py-2 text-xs font-bold uppercase tracking-wider ${KIND_STYLE[entry.kind]}`}
        >
          {KIND_LABEL[entry.kind]}
        </span>
        <span className="min-w-0 flex-1 px-3 py-2 text-sm font-semibold text-foreground group-hover:text-accent">
          {entry.label}
        </span>
      </TjLink>
    </aside>
  );
}
