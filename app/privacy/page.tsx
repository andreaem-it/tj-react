import Link from "next/link";
import { SITE_URL } from "@/lib/constants";

export const metadata = {
  title: "Privacy Policy",
  description: "Informativa sulla privacy di TechJournal.",
};

export default function PrivacyPage() {
  const iubendaUrl = process.env.NEXT_PUBLIC_IUBENDA_PRIVACY_URL;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Informativa sulla privacy</h1>
      {iubendaUrl ? (
        <p className="text-muted mb-4">
          La nostra informativa sulla privacy è disponibile sulla piattaforma iubenda.{" "}
          <a
            href={iubendaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Visualizza l’informativa completa
          </a>
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
            contatta il titolare del trattamento indicato nel footer del sito o configura l’URL
            dell’informativa iubenda in <code className="text-foreground">NEXT_PUBLIC_IUBENDA_PRIVACY_URL</code>.
          </p>
        </div>
      )}
      <Link href="/" className="inline-block mt-6 text-accent hover:underline text-sm">
        ← Torna alla home
      </Link>
    </div>
  );
}
