import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import PersonalDashboard from "@/components/personal/PersonalDashboard";

/**
 * Area personale.
 *
 * `noindex` non per pudore ma perché la pagina è **vuota per definizione** per
 * chiunque non sia il proprietario del browser: i dati stanno in `localStorage`,
 * quindi un crawler indicizzerebbe lo stato iniziale. `follow` resta attivo, i
 * link interni continuano a passare segnali.
 *
 * Statica: il guscio non dipende da nessun dato, il contenuto lo compone il
 * client. Nessuna funzione server per visita.
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: { absolute: "Area personale | TechJournal" },
  description:
    "Argomenti che segui, articoli salvati e prezzi che tieni d'occhio, conservati in questo browser.",
  robots: { index: false, follow: true },
};

export default function PersonalPage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl px-[5px] py-6 md:px-4">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Area personale" }]} />
      <h1 className="text-2xl font-bold text-foreground md:text-4xl">Area personale</h1>
      <p className="mt-3 max-w-2xl text-base text-muted">
        Quello che segui e salvi resta <strong className="text-foreground">in questo browser</strong>:
        nessun account, nessun dato inviato a noi. Svuotando i dati del sito o cambiando dispositivo
        le preferenze non si ritrovano.
      </p>
      <PersonalDashboard />
    </div>
  );
}
