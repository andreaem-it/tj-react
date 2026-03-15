import Link from "next/link";
import IubendaPolicyEmbed from "@/components/IubendaPolicyEmbed";

export const metadata = {
  title: "Privacy Policy",
  description: "Informativa sulla privacy di TechJournal.",
};

const DEFAULT_PRIVACY_PATH = "https://www.iubenda.com/privacy-policy";

function getPrivacyUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_IUBENDA_PRIVACY_URL;
  if (url) return url;
  const siteId = process.env.NEXT_PUBLIC_IUBENDA_SITE_ID;
  if (siteId) return `${DEFAULT_PRIVACY_PATH}/${siteId}`;
  return null;
}

export default function PrivacyPage() {
  const iubendaUrl = getPrivacyUrl();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Informativa sulla privacy</h1>
      {iubendaUrl ? (
        <p className="text-muted mb-4">
          La nostra informativa sulla privacy è disponibile sulla piattaforma iubenda. Clicca per
          visualizzarla in pagina (embed iubenda).{" "}
          <IubendaPolicyEmbed href={iubendaUrl} title="Privacy Policy">
            Visualizza l’informativa completa
          </IubendaPolicyEmbed>
        </p>
      ) : (
        <div className="prose prose-invert max-w-none text-muted space-y-4">
          <p>
            TechJournal rispetta la tua privacy. I dati raccolti (es. tramite cookie, newsletter,
            analytics) sono trattati nel rispetto del Regolamento UE 2016/679 (GDPR) e della
            normativa italiana.
          </p>
          <p>
            Per l’informativa completa su finalità, basi giuridiche, conservazione e tuoi diritti
            (accesso, rettifica, cancellazione, opposizione, portabilità, reclamo all’Autorità),
            contatta il titolare del trattamento indicato nel footer del sito o configura{" "}
            <code className="text-foreground">NEXT_PUBLIC_IUBENDA_PRIVACY_URL</code> oppure{" "}
            <code className="text-foreground">NEXT_PUBLIC_IUBENDA_SITE_ID</code> in .env.
          </p>
        </div>
      )}
      <Link href="/" className="inline-block mt-6 text-accent hover:underline text-sm">
        ← Torna alla home
      </Link>
    </div>
  );
}
