import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import TjLink from "@/components/TjLink";
import { SITE_URL } from "@/lib/constants";
import { HUB_TOPICS } from "@/lib/content/topics";
import type { Topic, TopicKind } from "@/lib/content/types";

/**
 * Indice degli argomenti.
 *
 * Esiste per una ragione precisa: senza, gli hub sarebbero raggiungibili solo
 * dalle chip dentro i singoli articoli. Un hub il cui unico ingresso è un
 * articolo che parla di quell'argomento è una pagina orfana — nessun percorso di
 * navigazione la include, e il crawler la trova solo di rimbalzo.
 *
 * Interamente statica: legge il registry, non fa alcuna richiesta di rete.
 */
export const dynamic = "force-static";

const canonical = `${SITE_URL.replace(/\/$/, "")}/topic`;

export const metadata: Metadata = {
  title: { absolute: "Argomenti: iOS, iPhone, Apple Intelligence e altri | TechJournal" },
  description:
    "Tutti gli argomenti seguiti da TechJournal: sistemi operativi, dispositivi, servizi e temi tecnologici, ognuno con notizie, guide e cronologia.",
  alternates: { canonical },
  openGraph: {
    title: "Argomenti | TechJournal",
    description: "Sistemi operativi, dispositivi, servizi e temi seguiti da TechJournal.",
    url: canonical,
    siteName: "TechJournal",
    type: "website",
  },
};

/**
 * Raggruppamento mostrato all'utente.
 *
 * Più grossolano di `TopicKind`: al lettore non interessa la differenza fra
 * `device-family` e `device-model`, gli interessa trovare "iPhone 18" sotto
 * "Dispositivi". I gruppi sono elencati nell'ordine in cui compaiono in pagina.
 */
const GROUPS: ReadonlyArray<{ label: string; kinds: readonly TopicKind[] }> = [
  { label: "Sistemi operativi", kinds: ["os-family", "os-release"] },
  { label: "Dispositivi", kinds: ["device-family", "device-model"] },
  { label: "Servizi e funzioni", kinds: ["service", "feature"] },
  { label: "Aziende", kinds: ["company"] },
  { label: "Temi ed eventi", kinds: ["theme", "event"] },
];

function groupOf(topic: Topic): string {
  return GROUPS.find((group) => group.kinds.includes(topic.kind))?.label ?? "Altro";
}

export default function TopicIndexPage() {
  const grouped = GROUPS.map((group) => ({
    label: group.label,
    topics: HUB_TOPICS.filter((topic) => groupOf(topic) === group.label),
  })).filter((group) => group.topics.length > 0);

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl px-[5px] py-6 md:px-4">
      <header className="mb-8">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Argomenti" }]} />
        <h1 className="text-2xl font-bold text-foreground md:text-4xl">Argomenti</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">
          Ogni argomento raccoglie notizie, guide e cronologia in una sola pagina, anche quando gli
          articoli sono pubblicati in categorie diverse.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        {grouped.map((group) => (
          <section key={group.label} aria-labelledby={`group-${group.label}`}>
            <h2
              id={`group-${group.label}`}
              className="mb-4 text-lg font-bold text-foreground md:text-xl"
            >
              {group.label}
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.topics.map((topic) => (
                <li key={topic.slug}>
                  <TjLink
                    href={`/topic/${topic.slug}`}
                    className="block h-full rounded-lg border border-border bg-content-bg p-4 transition-colors hover:border-accent"
                  >
                    <span className="block font-semibold text-foreground">{topic.name}</span>
                    <span className="mt-1 block text-sm text-muted">{topic.description}</span>
                  </TjLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
