import Link from "next/link";
import IubendaPolicyEmbed from "@/components/IubendaPolicyEmbed";
import IubendaEmbedScript from "@/components/IubendaEmbedScript";

export const metadata = {
  title: "Privacy e Cookie policy",
  description: "Informativa sulla privacy e cookie policy di TechJournal (iubenda).",
};

const DEFAULT_PRIVACY_PATH = "https://www.iubenda.com/privacy-policy";

function getPrivacyUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_IUBENDA_PRIVACY_URL;
  if (url) return url;
  const siteId = process.env.NEXT_PUBLIC_IUBENDA_SITE_ID;
  if (siteId) return `${DEFAULT_PRIVACY_PATH}/${siteId}`;
  return null;
}

function getCookiePolicyUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_URL;
  if (url) return url;
  const siteId = process.env.NEXT_PUBLIC_IUBENDA_SITE_ID;
  if (siteId) return `${DEFAULT_PRIVACY_PATH}/${siteId}/cookie-policy`;
  return null;
}

export default function PrivacyPage() {
  const privacyUrl = getPrivacyUrl();
  const cookieUrl = getCookiePolicyUrl();
  const hasAny = privacyUrl || cookieUrl;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Privacy e Cookie policy</h1>
      {hasAny ? (
        <div className="space-y-6 text-muted">
          {privacyUrl && (
            <p>
              La nostra informativa sulla privacy è disponibile sulla piattaforma iubenda. Clicca per
              visualizzarla in pagina.{" "}
              <IubendaPolicyEmbed href={privacyUrl} title="Privacy Policy">
                Visualizza l’informativa sulla privacy
              </IubendaPolicyEmbed>
            </p>
          )}
          {cookieUrl && (
            <p>
              La cookie policy e le preferenze sui cookie sono gestite da iubenda. Clicca per
              visualizzarla in pagina.{" "}
              <IubendaPolicyEmbed href={cookieUrl} title="Cookie Policy">
                Visualizza la cookie policy
              </IubendaPolicyEmbed>
            </p>
          )}
          <IubendaEmbedScript />
        </div>
      ) : (
        <div className="prose prose-invert max-w-none text-muted space-y-4">
          <p>
            TechJournal rispetta la tua privacy. I dati raccolti (es. tramite cookie, newsletter,
            analytics) sono trattati nel rispetto del Regolamento UE 2016/679 (GDPR) e della
            normativa italiana.
          </p>
          <p>
            Per l’informativa completa e la cookie policy configura{" "}
            <code className="text-foreground">NEXT_PUBLIC_IUBENDA_SITE_ID</code> in .env oppure
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
