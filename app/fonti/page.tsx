import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

const canonical = `${SITE_URL.replace(/\/$/, "")}/fonti`;

export const metadata: Metadata = {
  title: "Fonti - Come citiamo e verifichiamo le informazioni",
  description:
    "Quali fonti usa TechJournal, come vengono citate negli articoli e come distinguiamo notizie ufficiali, report e rumor.",
  alternates: { canonical },
  openGraph: {
    title: "Fonti - Come citiamo le informazioni | TechJournal",
    description:
      "Quali fonti usa TechJournal e come vengono citate negli articoli.",
    url: canonical,
    siteName: "TechJournal",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Fonti | TechJournal",
    description: "Come TechJournal cita e verifica le proprie fonti.",
  },
};

const PRIMARY_SOURCES = [
  { name: "Apple", note: "comunicati, note di rilascio, documentazione per sviluppatori" },
  { name: "Google / Android", note: "blog ufficiali, note di rilascio" },
];

const REPORT_SOURCES = [
  { name: "Bloomberg (Mark Gurman)", note: "anticipazioni e report sul mondo Apple" },
  { name: "Reuters", note: "notizie economiche e di settore" },
  { name: "The Information", note: "report tecnologici e finanziari" },
  { name: "The Wall Street Journal", note: "notizie economiche e di settore" },
  { name: "Nikkei", note: "filiera produttiva e componentistica asiatica" },
  { name: "DigiTimes", note: "filiera produttiva e componentistica asiatica" },
  { name: "The Elec", note: "filiera dei semiconduttori e display" },
];

const TECH_MEDIA_SOURCES = [
  { name: "9to5Mac", note: "" },
  { name: "9to5Google", note: "" },
  { name: "MacRumors", note: "" },
  { name: "The Verge", note: "" },
  { name: "Engadget", note: "" },
  { name: "Ars Technica", note: "" },
  { name: "TechCrunch", note: "" },
  { name: "GSMArena", note: "" },
];

export default function FontiPage() {
  return (
    <div className="max-w-3xl mx-auto px-0 md:px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-2">Fonti</h1>
      <p className="text-muted text-lg mb-8">
        Da dove viene ciò che pubblichiamo e come lo citiamo.
      </p>

      <div className="prose prose-invert max-w-none text-muted space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Come citiamo le fonti</h2>
          <p>
            Quando un articolo riprende un&apos;informazione da un&apos;altra pubblicazione, il
            link alla fonte originale compare in fondo al testo, nella sezione &quot;Fonti&quot;
            dell&apos;articolo stesso. Non aggiungiamo citazioni che l&apos;articolo non contenga
            già: se un pezzo non cita fonti esterne, è perché si basa su comunicati diretti o su
            un aggiornamento di un contenuto già pubblicato in precedenza.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Fonti primarie</h2>
          <p>
            Quando disponibili, privilegiamo sempre la fonte diretta: comunicati ufficiali,
            changelog, note di rilascio, documentazione tecnica.
          </p>
          <ul className="list-disc pl-6 space-y-1">
            {PRIMARY_SOURCES.map((s) => (
              <li key={s.name}>
                <strong className="text-foreground">{s.name}</strong> — {s.note}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Report e fonti di settore
          </h2>
          <p>
            Per anticipazioni non ancora confermate ufficialmente ci affidiamo a testate e
            analisti con una comprovata affidabilità nel settore tecnologico. Un&apos;informazione
            attribuita a queste fonti viene etichettata come{" "}
            <strong className="text-foreground">Report</strong>, non come notizia ufficiale.
          </p>
          <ul className="list-disc pl-6 space-y-1">
            {REPORT_SOURCES.map((s) => (
              <li key={s.name}>
                <strong className="text-foreground">{s.name}</strong>
                {s.note ? ` — ${s.note}` : ""}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Testate tecnologiche</h2>
          <p>
            Per la copertura quotidiana di prodotti, software e mercato monitoriamo le principali
            testate tech internazionali, citate quando riportano un&apos;informazione che
            approfondiamo.
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 list-disc pl-6">
            {TECH_MEDIA_SOURCES.map((s) => (
              <li key={s.name}>{s.name}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Cosa non consideriamo una fonte
          </h2>
          <p>
            I link a negozi online o a piattaforme di affiliazione (es. Amazon) non sono citazioni
            editoriali: sono gestiti separatamente come parte di{" "}
            <Link href="/price-radar" className="text-accent hover:underline">
              Price Radar
            </Link>{" "}
            e non influenzano in alcun modo la valutazione di una notizia o di un prezzo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Affidabilità e correzioni</h2>
          <p>
            Ogni articolo è classificato come Ufficiale, Report o Rumor in base alla fonte che lo
            origina — la logica è descritta in{" "}
            <Link href="/politica-editoriale" className="text-accent hover:underline">
              Politica editoriale
            </Link>
            . Se una fonte si rivela inesatta o un&apos;indiscrezione viene smentita, l&apos;articolo
            viene aggiornato e la modifica tracciata secondo il processo descritto in{" "}
            <Link href="/correzioni" className="text-accent hover:underline">
              Correzioni
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
