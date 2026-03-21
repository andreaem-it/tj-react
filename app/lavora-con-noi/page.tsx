import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

const canonical = `${SITE_URL.replace(/\/$/, "")}/lavora-con-noi`;

export const metadata: Metadata = {
  title: "Lavora con noi - Scrivi di Apple, Tech e Gaming",
  description:
    "TechJournal cerca autori. Retribuzione a parola, validazione redazionale e possibilità di crescita. Candidati per scrivere di tech, Apple e gaming.",
  alternates: { canonical },
  openGraph: {
    title: "Lavora con noi - Scrivi di Apple, Tech e Gaming | TechJournal",
    description:
      "TechJournal cerca autori. Retribuzione a parola, validazione redazionale. Candidati per scrivere di tech, Apple e gaming.",
    url: canonical,
    siteName: "TechJournal",
    type: "website",
  },
  twitter: { card: "summary", title: "Lavora con noi | TechJournal", description: "Candidati per scrivere di tech, Apple e gaming." },
};

export default function LavoraConNoiPage() {
  return (
    <div className="max-w-3xl mx-auto px-0 md:px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-2">Lavora con noi</h1>
      <p className="text-muted text-lg mb-8">
        TechJournal sta cercando nuovi autori. Se la tecnologia è la tua passione e hai sempre
        sognato di scrivere per un progetto online, puoi farne parte.
      </p>

      <div className="prose prose-invert max-w-none text-muted space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Perché scrivere per noi</h2>
          <p>
            Lanciare un progetto editoriale nel campo della tecnologia, in un panorama già ricco di
            testate e portali, non è semplice. Per questo abbiamo scelto di aprire le porte a
            tutti: chi ha voglia di raccontare la tech può farlo con noi, con un{" "}
            <strong className="text-foreground">rendiconto economico trasparente</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Come funziona la retribuzione</h2>
          <p>
            Il pagamento viene effettuato mensilmente sul tuo conto <strong className="text-foreground">PayPal</strong> e
            si basa sul numero di parole e sulle immagini utilizzate. La struttura è la seguente:
          </p>
          <ul className="list-disc pl-6 space-y-1 my-4">
            <li>
              <strong className="text-foreground">Pagamento base</strong>: 0,25 €
            </li>
            <li>
              <strong className="text-foreground">200 parole</strong>: 0,10 €
            </li>
            <li>
              <strong className="text-foreground">300 parole</strong>: 0,20 €
            </li>
            <li>
              <strong className="text-foreground">400 parole</strong>: 0,35 €
            </li>
            <li>
              <strong className="text-foreground">500 parole</strong>: 0,50 €
            </li>
          </ul>
          <p>
            Il pagamento base si somma alla fascia di parole raggiunta. Esempio: un articolo da 265
            parole viene retribuito con 0,35 €. L’articolo deve essere di almeno 200 parole per
            accedere al pagamento minimo.
          </p>
          <p>
            Le <strong className="text-foreground">immagini</strong> (oltre alla copertina, obbligatoria)
            aumentano il compenso: dalla terza immagine in poi, ogni immagine con fonte citata (o
            preferibilmente originale) vale 0,05 € in più.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Bonus e crescita</h2>
          <p>
            A fine mese i post che avranno ricevuto più visite potranno ricevere un{" "}
            <strong className="text-foreground">bonus variabile</strong> (da 0,50 € a 2,00 €). I
            dati sono verificati tramite strumenti analytics che escludono le visite dell’autore o
            da dispositivi ad esso associati.
          </p>
          <p>
            In questa fase i ricavi del sito sono limitati e i pagamenti sono sostenuti dal team.
            Quando i ricavi aumenteranno, aumenteranno anche le retribuzioni per gli autori, con
            un occhio di riguardo per chi ci avrà seguito fin dall’inizio.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Come vengono validati gli articoli</h2>
          <p>
            Ogni articolo viene messo in stato di bozza e moderato in forma anonima da un autore
            della redazione, per evitare favoritismi. Valutiamo qualità del testo, interesse
            dell’argomento e unicità del contenuto.
          </p>
          <p>
            Non sono ammessi articoli copia-incolla senza valore aggiunto: è consentito prendere
            spunto da altre fonti solo citandole o rielaborando in modo significativo il testo.
            Articoli scritti male, con errori ortografici evidenti o di cattivo gusto non vengono
            pubblicati e in alcuni casi possono portare alla chiusura dell’account.
          </p>
          <p>
            Una volta approvato, il post diventa visibile in home e condivisibile sui social.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Come candidarti</h2>
          <p>
            Compila il modulo nella pagina{" "}
            <Link href="/contatti" className="text-accent hover:underline">
              Contatti
            </Link>
            , indicando nell’oggetto <strong className="text-foreground">«Candidatura autore»</strong>.
            Nel messaggio presentati, raccontaci di te, delle tue passioni e del valore che
            potresti portare a TechJournal.
          </p>
          <p>
            Siamo un gruppo di appassionati e il progetto è in gran parte amatoriale: sii te stesso.
            Se il tuo profilo è in linea con ciò che cerchiamo, riceverai al più presto una
            risposta.
          </p>
        </section>
      </div>

      <div className="mt-10 p-4 rounded-lg bg-content-bg border border-border">
        <p className="text-foreground font-medium mb-2">Hai già un account autore?</p>
        <p className="text-sm text-muted">
          Dopo la validazione della candidatura potrai accedere al profilo autore e inserire il tuo
          indirizzo PayPal per ricevere i pagamenti. Il sistema è automatico; non ci assumiamo
          responsabilità per pagamenti inviati a indirizzi errati.
        </p>
      </div>

    </div>
  );
}
