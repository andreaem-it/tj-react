import Image from "next/image";
import TjLink from "@/components/TjLink";
import { sanitizeRichHtml } from "@/lib/sanitizeRichHtml";
import type { AuthorProfile } from "@/lib/api";

/**
 * Box "Scritto da" (§40).
 *
 * Server Component: non usa hook né gestori di eventi, e la direttiva
 * `"use client"` che aveva prima trascinava `sanitize-html` — 236 KB — nel
 * bundle del browser.
 *
 * Riceve `AuthorProfile` (`lib/api.ts`), non l'oggetto autore grezzo di
 * WordPress: fino al deploy del plugin aggiornato `fetchAuthorBySlug`
 * restituisce sempre `null` (§40, vedi `docs/` o il commento sulla funzione),
 * e questo componente degrada di conseguenza — nessun link, nessun crash.
 */
export default function AuthorCard({ author }: { author: AuthorProfile | null }) {
  if (!author || !author.name.trim()) return null;

  const safeBio = author.bio.trim() ? sanitizeRichHtml(author.bio) : "";
  const authorHref = `/autore/${author.slug}`;

  return (
    <div className="flex items-start gap-4">
      {author.avatarUrl && (
        <Image
          src={author.avatarUrl}
          alt={author.name}
          width={96}
          height={96}
          sizes="(max-width: 768px) 48px, 96px"
          className="rounded-full object-cover shrink-0 w-12 h-12 md:w-[96px] md:h-[96px]"
        />
      )}
      <div className="min-w-0">
        <p className="text-muted text-sm font-semibold uppercase tracking-wide mb-1">Scritto da</p>
        <TjLink href={authorHref} className="text-foreground font-medium hover:text-accent hover:underline">
          {author.name}
        </TjLink>
        {safeBio && (
          <div
            className="text-muted text-sm mt-2 leading-relaxed [&_p]:mb-2 last:[&_p]:mb-0"
            dangerouslySetInnerHTML={{ __html: safeBio }}
          />
        )}
      </div>
    </div>
  );
}
