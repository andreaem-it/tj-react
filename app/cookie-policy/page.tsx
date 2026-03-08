import Link from "next/link";

export const metadata = {
  title: "Cookie Policy",
  description: "Informativa sui cookie di TechJournal.",
};

export default function CookiePolicyPage() {
  const iubendaCookieUrl = process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_URL;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Cookie Policy</h1>
      {iubendaCookieUrl ? (
        <p className="text-muted mb-4">
          La nostra cookie policy e le preferenze sui cookie sono gestite da iubenda.{" "}
          <a
            href={iubendaCookieUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Visualizza la cookie policy
          </a>
        </p>
      ) : (
        <div className="prose prose-invert max-w-none text-muted space-y-4">
          <p>
            Utilizziamo cookie e tecnologie simili per funzionamento del sito, analytics e, con il
            tuo consenso, per pubblicità. Puoi gestire le preferenze tramite il banner cookie
            (iubenda) al primo accesso o in qualsiasi momento dalle impostazioni del browser.
          </p>
          <p>
            Per i dettagli sui cookie utilizzati e sulle finalità, configura l’URL della cookie
            policy iubenda in <code className="text-foreground">NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_URL</code> oppure
            contatta il titolare indicato nel footer.
          </p>
        </div>
      )}
      <Link href="/" className="inline-block mt-6 text-accent hover:underline text-sm">
        ← Torna alla home
      </Link>
    </div>
  );
}
