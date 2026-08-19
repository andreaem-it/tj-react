import TjLink from "@/components/TjLink";
import type { HomeSectionConfig } from "@/lib/home/sections";

/**
 * Intestazione comune delle sezioni della home.
 *
 * Esiste per una ragione sola: senza, ogni sezione ridefinirebbe la propria
 * gerarchia di titoli e la propria spaziatura, e dopo tre iterazioni la home
 * avrebbe cinque stili di intestazione leggermente diversi.
 *
 * Il titolo è sempre un `<h2>`: sotto l'unico `<h1>` della pagina, e sopra gli
 * `<h2>` delle card — che sono titoli di articolo, non di sezione. È una
 * gerarchia che gli screen reader usano per saltare fra i blocchi.
 */
export default function HomeSectionShell({
  section,
  children,
  className,
}: {
  section: Pick<HomeSectionConfig, "id" | "title" | "subtitle" | "moreHref" | "moreLabel">;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = `home-section-${section.id}`;

  return (
    <section aria-labelledby={section.title ? headingId : undefined} className={className}>
      {section.title && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h2 id={headingId} className="text-lg font-bold text-foreground md:text-xl">
              {section.title}
            </h2>
            {section.subtitle && <p className="mt-1 text-sm text-muted">{section.subtitle}</p>}
          </div>
          {section.moreHref && (
            <TjLink
              href={section.moreHref}
              className="shrink-0 text-sm text-accent hover:underline"
            >
              {section.moreLabel ?? "Vedi tutto"} →
            </TjLink>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
