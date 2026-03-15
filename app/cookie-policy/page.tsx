import Link from "next/link";
import IubendaPolicyEmbed from "@/components/IubendaPolicyEmbed";

export const metadata = {
  title: "Cookie Policy",
  description: "Informativa sui cookie di TechJournal.",
};

const DEFAULT_PRIVACY_PATH = "https://www.iubenda.com/privacy-policy";

function getCookiePolicyUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_URL;
  if (url) return url;
  const siteId = process.env.NEXT_PUBLIC_IUBENDA_SITE_ID;
  if (siteId) return `${DEFAULT_PRIVACY_PATH}/${siteId}/cookie-policy`;
  return null;
}

export default function CookiePolicyPage() {
  const iubendaCookieUrl = getCookiePolicyUrl();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Cookie Policy</h1>
      {iubendaCookieUrl ? (
        <p className="text-muted mb-4">
          La nostra cookie policy e le preferenze sui cookie sono gestite da iubenda. Clicca per
          visualizzarla in pagina (embed iubenda).{" "}
          <IubendaPolicyEmbed href={iubendaCookieUrl} title="Cookie Policy">
            Visualizza la cookie policy
          </IubendaPolicyEmbed>
        </p>
      ) : (
        <div className="prose prose-invert max-w-none text-muted space-y-4">
          <p>
            Utilizziamo cookie e tecnologie simili per funzionamento del sito, analytics e, con il
            tuo consenso, per pubblicità. Puoi gestire le preferenze tramite il banner cookie
            (iubenda) al primo accesso o in qualsiasi momento dalle impostazioni del browser.
          </p>
          <p>
            Per i dettagli sui cookie utilizzati e sulle finalità, configura{" "}
            <code className="text-foreground">NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_URL</code> oppure{" "}
            <code className="text-foreground">NEXT_PUBLIC_IUBENDA_SITE_ID</code> in .env, oppure
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
