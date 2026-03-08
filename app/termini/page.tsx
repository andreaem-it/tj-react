import Link from "next/link";

export const metadata = {
  title: "Termini e condizioni",
  description: "Termini e condizioni di utilizzo di TechJournal.",
};

export default function TerminiPage() {
  const iubendaTermsUrl = process.env.NEXT_PUBLIC_IUBENDA_TERMS_URL;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Termini e condizioni</h1>
      {iubendaTermsUrl ? (
        <p className="text-muted mb-4">
          I termini e condizioni di utilizzo del sito sono disponibili sulla piattaforma iubenda.{" "}
          <a
            href={iubendaTermsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Visualizza i termini
          </a>
        </p>
      ) : (
        <div className="prose prose-invert max-w-none text-muted space-y-4">
          <p>
            L’utilizzo del sito TechJournal implica l’accettazione dei presenti termini. I
            contenuti hanno scopo informativo; le opinioni espresse sono degli autori. È vietata
            la riproduzione non autorizzata. Per questioni legali o commerciali contattare il
            titolare (vedi footer).
          </p>
          <p>
            Per i termini completi puoi configurare l’URL iubenda in{" "}
            <code className="text-foreground">NEXT_PUBLIC_IUBENDA_TERMS_URL</code>.
          </p>
        </div>
      )}
      <Link href="/" className="inline-block mt-6 text-accent hover:underline text-sm">
        ← Torna alla home
      </Link>
    </div>
  );
}
