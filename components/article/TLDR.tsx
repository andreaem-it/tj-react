/**
 * TL;DR (§14): 3-5 punti chiave generati una sola volta dall'autoposter e
 * persistiti su WordPress (`tj_tldr`) — non ricalcolati a ogni richiesta.
 *
 * Nessun fallback generato lato client: un articolo senza `tldr` compilato
 * (troppo corto, o pubblicato prima che questo campo esistesse) non mostra
 * nulla, invece di inventare un riassunto al volo.
 */
export default function TLDR({ points }: { points?: readonly string[] }) {
  if (!points || points.length === 0) return null;

  return (
    <div
      className="mb-6 rounded-lg border border-border bg-surface-overlay px-4 py-3.5"
      aria-label="Riepilogo rapido dell'articolo"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
        In breve
      </p>
      <ul className="space-y-1.5 text-sm text-foreground list-disc pl-5 marker:text-accent">
        {points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
    </div>
  );
}
