"use client";

import { usePersonal } from "@/lib/personal/usePersonal";
import { isArticleSaved, saveArticle, unsaveArticle } from "@/lib/personal/store";

/**
 * "Salva per dopo" sull'articolo (§46).
 *
 * Salva l'indispensabile — identificativo, percorso, titolo — e non il contenuto:
 * l'articolo può essere corretto o aggiornato dopo il salvataggio, e conservarne
 * una copia significherebbe mostrare al lettore una versione che il sito non
 * pubblica più.
 */
export default function SaveArticleButton({
  id,
  path,
  title,
  className,
}: {
  id: number;
  path: string;
  title: string;
  className?: string;
}) {
  const { data, hydrated, update } = usePersonal();
  const saved = hydrated && isArticleSaved(data, id);

  return (
    <button
      type="button"
      disabled={!hydrated}
      aria-pressed={saved}
      onClick={() =>
        update((current) =>
          isArticleSaved(current, id)
            ? unsaveArticle(current, id)
            : saveArticle(current, { id, path, title }, Date.now()),
        )
      }
      title={
        saved
          ? "Salvato in questo browser: lo trovi in Area personale"
          : "Salva questo articolo per rileggerlo dopo"
      }
      className={`inline-flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ${
        saved ? "text-accent" : "text-muted hover:text-accent"
      } ${className ?? ""}`}
    >
      <span aria-hidden>{saved ? "★" : "☆"}</span>
      {saved ? "Salvato" : "Salva"}
    </button>
  );
}
