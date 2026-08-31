import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import TjLink from "@/components/TjLink";
import { SITE_URL } from "@/lib/constants";

/**
 * Pagina di trasparenza su automazione e intelligenza artificiale (§41).
 *
 * ## Regola per chi modifica questo file
 *
 * Ogni affermazione qui dentro deve essere **verificabile nel codice di questo
 * repository**. Non è una dichiarazione d'intenti: è la descrizione di come il
 * sito si comporta, e se il comportamento cambia va cambiata anche la pagina.
 * In particolare la frase "nessun modello linguistico interviene quando una
 * pagina viene servita" smette di essere vera nel momento in cui compare un
 * provider AI fra le dipendenze.
 *
 * La pipeline redazionale vive nel backend `tj-api`: se cambia, questa pagina
 * deve essere riallineata insieme al relativo flusso di ingestione.
 */
export const dynamic = "force-static";

const canonical = `${SITE_URL.replace(/\/$/, "")}/ai-e-automazione`;

export const metadata: Metadata = {
  title: { absolute: "Automazione e intelligenza artificiale su TechJournal" },
  description:
    "Cosa è automatico su TechJournal, come vengono classificate le notizie, come si calcola la valutazione dei prezzi e cosa il sistema non fa mai.",
  alternates: { canonical },
  openGraph: {
    title: "Automazione e intelligenza artificiale | TechJournal",
    description:
      "Cosa è automatico, come funziona e cosa il sistema non fa mai. In chiaro.",
    url: canonical,
    siteName: "TechJournal",
    type: "website",
  },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-xl font-bold text-foreground md:text-2xl">
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 text-base leading-relaxed text-article-text">
        {children}
      </div>
    </section>
  );
}

export default function AiEAutomazionePage() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl px-[5px] py-6 md:px-4">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Automazione e AI" }]}
      />

      <h1 className="text-2xl font-bold text-foreground md:text-4xl">
        Automazione e intelligenza artificiale
      </h1>
      <p className="mt-4 text-lg text-muted">
        TechJournal usa sistemi automatici per organizzare le informazioni. Questa pagina spiega
        quali, come funzionano e — soprattutto — cosa non fanno.
      </p>

      <Section id="principio" title="Il principio">
        <p>
          L&apos;automazione qui serve a <strong className="text-foreground">organizzare</strong>{" "}
          informazioni, non a sostituire la verifica di un fatto. Un sistema automatico può dire che
          un articolo parla di iOS 27, che un prezzo è sceso rispetto alla sua media, o che una
          compatibilità è dichiarata dal produttore. Non può dire se una notizia è vera.
        </p>
        <p>
          Per questo tutto ciò che segue è <strong className="text-foreground">deterministico</strong>:
          date le stesse informazioni in ingresso produce sempre lo stesso risultato, e quel risultato
          si può controllare.
        </p>
      </Section>

      <Section id="supporto-redazionale" title="AI a supporto della redazione">
        <p>
          Prima della pubblicazione, la pipeline redazionale può usare modelli linguistici per
          tradurre titoli, classificare gli elementi raccolti dai feed e preparare una bozza di
          articolo. Il modello e le istruzioni di sistema sono configurati dalla redazione.
        </p>
        <p>
          L&apos;output non viene considerato una fonte: passa attraverso controlli automatici di
          struttura, qualità, duplicazione e collegamenti. Gli elementi che non superano le soglie
          previste vengono fermati o inviati alla coda di revisione. La responsabilità del contenuto
          pubblicato resta editoriale.
        </p>
        <p>
          Questa fase è separata dal sito che stai leggendo: aprire una pagina non avvia una nuova
          generazione e non cambia il testo in base al lettore.
        </p>
      </Section>

      <Section id="classificazione" title="Come vengono classificate le notizie">
        <p>
          Ogni articolo viene analizzato per riconoscere gli argomenti di cui parla, il formato
          (notizia, guida, confronto, approfondimento) e il grado di certezza dell&apos;informazione.
          L&apos;analisi lavora sul testo con regole scritte e un elenco di argomenti mantenuto a
          mano: non c&apos;è nessun modello linguistico coinvolto.
        </p>
        <p>
          Il grado di certezza è quello che vedi come etichetta accanto al titolo:{" "}
          <strong className="text-foreground">Ufficiale</strong> quando l&apos;azienda ha comunicato
          o reso disponibile qualcosa, <strong className="text-foreground">Report</strong> quando
          l&apos;informazione è attribuita a una fonte di settore,{" "}
          <strong className="text-foreground">Rumor</strong> quando è un&apos;indiscrezione non
          confermata che può rivelarsi sbagliata. Dove non c&apos;è un segnale chiaro non compare
          alcuna etichetta: preferiamo non dire nulla piuttosto che attribuire una fonte inesistente.
        </p>
      </Section>

      <Section id="prezzi" title="Come si calcola la valutazione dei prezzi">
        <p>
          Su <TjLink href="/price-radar" className="text-accent hover:underline">Price Radar</TjLink>{" "}
          ogni prodotto ha una valutazione — da <em>minimo storico</em> a <em>prezzo alto</em> —
          calcolata con una formula, non con un giudizio.
        </p>
        <p>
          Il confronto avviene con la media del prezzo <strong className="text-foreground">nel
          tempo</strong>: ogni prezzo osservato pesa per quanto è rimasto in vigore, non per quante
          volte lo abbiamo letto. È una distinzione che conta, perché controlliamo i prodotti a
          intervalli irregolari e una media dei controlli descriverebbe la nostra cadenza invece del
          prezzo.
        </p>
        <p>
          Quando lo storico è troppo breve la valutazione non viene espressa e leggi{" "}
          <strong className="text-foreground">dati insufficienti</strong>. Non è un errore: è la
          risposta corretta finché non abbiamo abbastanza rilevazioni. I periodi in cui non abbiamo
          osservato il prezzo restano vuoti nel grafico, segnati da un tratteggio, e non vengono
          riempiti con valori inventati.
        </p>
      </Section>

      <Section id="compatibilita" title="Previsioni e compatibilità">
        <p>
          Nel database di{" "}
          <TjLink href="/compatibility" className="text-accent hover:underline">
            compatibilità Apple
          </TjLink>{" "}
          alcune voci riguardano dispositivi non ancora usciti. Sono marcate come{" "}
          <strong className="text-foreground">Previsto</strong> e le pagine dichiarano quante voci
          siano previsioni sul totale. Una previsione non è una compatibilità verificata, e non viene
          presentata come tale.
        </p>
      </Section>

      <Section id="cosa-non-facciamo" title="Cosa il sistema non fa mai">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Non scrive frasi come <em>&laquo;lo abbiamo provato&raquo;</em> o{" "}
            <em>&laquo;nei nostri test&raquo;</em> se una prova reale non è avvenuta.
          </li>
          <li>
            Non genera voti, stelle o recensioni. Nei dati strutturati che pubblichiamo per i motori
            di ricerca non compare nessun punteggio di prodotto: le stelline nei risultati di ricerca
            si ottengono facilmente, e sarebbero false.
          </li>
          <li>
            Non inventa prezzi mancanti, né rilevazioni intermedie per rendere un grafico più
            regolare.
          </li>
          <li>
            Non lascia che l&apos;affiliazione influenzi la valutazione di un prezzo: il calcolo usa
            solo lo storico, e non sa se il link è affiliato.
          </li>
          <li>
            Non fa intervenire alcun modello linguistico quando una pagina viene aperta. Tutto ciò
            che leggi è stato calcolato con regole, non generato al momento.
          </li>
        </ul>
      </Section>

      <Section id="umano" title="Cosa resta umano">
        <p>
          Recensioni, prove sul campo, fotografie, opinioni e valutazioni che richiedono di avere un
          prodotto fra le mani non sono automatizzabili e non vengono automatizzate. Quando un
          contenuto di questo tipo verrà pubblicato, porterà la firma di chi lo ha scritto.
        </p>
      </Section>

      <Section id="affiliazione" title="Link affiliati">
        <p>
          Alcuni link verso i negozi sono affiliati: se acquisti, TechJournal riceve una commissione
          senza costi aggiuntivi per te. Sono dichiarati sulla pagina in cui compaiono e marcati come
          tali anche per i motori di ricerca. Restano tre cose separate: il{" "}
          <strong className="text-foreground">dato</strong> di prezzo, la{" "}
          <strong className="text-foreground">valutazione</strong> algoritmica e il{" "}
          <strong className="text-foreground">link</strong> di acquisto.
        </p>
      </Section>

      <Section id="errori" title="Se trovi un errore">
        <p>
          Un sistema deterministico sbaglia in modo prevedibile, e quando sbaglia è possibile capire
          perché. Se un&apos;etichetta, una valutazione o una compatibilità ti sembrano sbagliate,{" "}
          <TjLink href="/contatti" className="text-accent hover:underline">
            segnalacelo
          </TjLink>
          : le regole si correggono, e la correzione vale da quel momento su tutto l&apos;archivio.
        </p>
      </Section>

      <p className="mt-10 border-t border-border pt-6 text-sm text-muted">
        Per la linea editoriale, le fonti e la gestione dei contenuti vedi la{" "}
        <TjLink href="/politica-editoriale" className="text-accent hover:underline">
          politica editoriale
        </TjLink>
        .
      </p>
    </div>
  );
}
