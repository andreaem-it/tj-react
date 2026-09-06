import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

const canonical = `${SITE_URL.replace(/\/$/, "")}/correzioni`;

export const metadata: Metadata = {
  title: "Correzioni - Come gestiamo gli errori",
  description:
    "Come segnalare un errore su TechJournal, cosa succede dopo una segnalazione e come rendiamo visibili le correzioni.",
  alternates: { canonical },
  openGraph: {
    title: "Correzioni - Come gestiamo gli errori | TechJournal",
    description:
      "Come segnalare un errore su TechJournal e come rendiamo visibili le correzioni.",
    url: canonical,
    siteName: "TechJournal",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Correzioni | TechJournal",
    description: "Come segnaliamo e correggiamo gli errori su TechJournal.",
  },
};

export default function CorrezioniPage() {
  return (
    <div className="max-w-3xl mx-auto px-0 md:px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-2">Correzioni</h1>
      <p className="text-muted text-lg mb-8">
        Come segnaliamo, verifichiamo e rendiamo visibili gli errori sui contenuti pubblicati.
      </p>

      <div className="prose prose-invert max-w-none text-muted space-y-6">
        <p>
          TechJournal si impegna a pubblicare informazioni accurate, ma può capitare di sbagliare:
          un dato riportato male, una fonte fraintesa, un dettaglio tecnico impreciso. Quando
          succede, la correzione va resa visibile con la stessa evidenza dell&apos;errore — non
          silenziosamente.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Come segnalare un errore</h2>
          <p>
            Chiunque noti un&apos;imprecisione può scriverci tramite la pagina{" "}
            <Link href="/contatti" className="text-accent hover:underline">
              Contatti
            </Link>
            , indicando l&apos;articolo e il punto contestato. Le segnalazioni via email sono
            preferibili a quelle sui social, perché restano tracciabili.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            2. Cosa succede dopo una segnalazione
          </h2>
          <p>
            Verifichiamo la segnalazione confrontandola con le fonti originarie. Se l&apos;errore è
            confermato, l&apos;articolo viene corretto il prima possibile. Se la segnalazione
            riguarda un&apos;opinione editoriale o un giudizio, non una notizia di fatto, lo
            spieghiamo a chi ha scritto, ma non è detto che comporti una correzione.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            3. Come rendiamo visibile una correzione
          </h2>
          <p>
            Su una notizia, la correzione viene indicata direttamente nel testo, nel punto
            interessato. Sui contenuti di aggiornamento continuo (guide, confronti,
            approfondimenti) la correzione compare nella cronologia aggiornamenti in fondo
            all&apos;articolo, con la data e una riga che spiega cosa è cambiato — non una modifica
            silenziosa al testo esistente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Correzione o aggiornamento?</h2>
          <p>
            Non sono la stessa cosa. Una correzione rimedia a un&apos;informazione che era sbagliata
            quando l&apos;abbiamo pubblicata. Un aggiornamento riflette un cambiamento avvenuto dopo
            — una nuova versione software, un prezzo cambiato, una funzione rimossa. Entrambi
            vengono dichiarati, ma solo il primo è un errore nostro.
          </p>
        </section>
      </div>
    </div>
  );
}
