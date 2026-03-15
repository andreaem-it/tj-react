import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

const canonical = `${SITE_URL.replace(/\/$/, "")}/politica-editoriale`;

export const metadata: Metadata = {
  title: "Politica editoriale - Qualità e trasparenza tech",
  description:
    "Missione, qualità dei contenuti, fonti e trasparenza: come lavora la redazione di TechJournal su notizie Apple e tecnologia.",
  alternates: { canonical },
  openGraph: {
    title: "Politica editoriale - Qualità e trasparenza | TechJournal",
    description:
      "Missione, qualità dei contenuti, fonti e trasparenza: come lavora la redazione di TechJournal.",
    url: canonical,
    siteName: "TechJournal",
    type: "website",
  },
  twitter: { card: "summary", title: "Politica editoriale | TechJournal", description: "Come lavora la redazione TechJournal." },
};

export default function PoliticaEditorialePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-2">Politica editoriale</h1>
      <p className="text-muted text-lg mb-8">
        I principi con cui TechJournal seleziona, redige e pubblica i propri contenuti.
      </p>

      <div className="prose prose-invert max-w-none text-muted space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Missione editoriale</h2>
          <p>
            L’obiettivo di TechJournal è fornire contenuti tecnologici informativi, accurati e
            pertinenti. Ci impegniamo a mantenere uno standard elevato nella presentazione delle
            notizie e a garantire una copertura il più possibile completa e imparziale delle
            novità nel mondo della tecnologia.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Qualità dei contenuti</h2>
          <p>
            Tutti i contenuti pubblicati sono soggetti a controlli di qualità. Ogni articolo deve
            rispettare gli standard editoriali del sito, essere grammaticalmente corretto e
            comprensibile per un’ampia audience.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Fonti di informazione</h2>
          <p>
            Gli articoli possono essere scritti direttamente dagli autori o redatti con il supporto
            di strumenti di intelligenza artificiale, sempre sotto la responsabilità della
            redazione. Quando le informazioni provengono da fonti esterne, ci impegniamo a citare
            chiaramente la fonte e a verificarne l’accuratezza per quanto possibile.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Originalità</h2>
          <p>
            Incentiviamo contenuti originali e unici. Anche laddove vengano utilizzati strumenti
            di supporto alla scrittura, il risultato finale deve essere originale e aggiungere
            valore per i lettori.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Trasparenza e credibilità</h2>
          <p>
            TechJournal punta alla massima trasparenza. L’origine delle informazioni esterne viene
            indicata quando rilevante. Eventuali correzioni o rettifiche sono pubblicate in modo
            tempestivo e visibile.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Diversità di punti di vista</h2>
          <p>
            Riconosciamo la varietà di opinioni nel mondo tech. Cerchiamo di presentare una gamma
            equilibrata di prospettive, evitando il partigianaggio e garantendo una copertura
            imparziale dei fatti.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">7. Responsabilità sociale</h2>
          <p>
            Ci impegniamo a usare tecnologia e informazione in modo responsabile. Evitiamo la
            diffusione di notizie false o sensazionalistiche e promuoviamo un uso etico delle
            tecnologie emergenti.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">8. Coinvolgimento della community</h2>
          <p>
            Il feedback dei lettori è benvenuto. Invitiamo chi legge a esprimere opinioni,
            suggerimenti e correzioni: il dialogo contribuisce a migliorare la qualità del
            giornale.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">9. Aggiornamenti</h2>
          <p>
            La presente politica editoriale può essere rivista e aggiornata periodicamente per
            riflettere nuove esigenze editoriali, normative o cambiamenti del contesto
            tecnologico.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">10. Collaborazioni</h2>
          <p>
            In caso di collaborazioni con terze parti, ci assicuriamo che siano conformi ai nostri
            standard etici ed editoriali. Le collaborazioni sono rese trasparenti ai lettori
            quando appropriato.
          </p>
        </section>
      </div>
    </div>
  );
}
