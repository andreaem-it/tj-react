import Link from "next/link";
import IubendaPolicyContent from "@/components/IubendaPolicyContent";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

const canonical = `${SITE_URL.replace(/\/$/, "")}/privacy`;

export const metadata: Metadata = {
  title: "Privacy e Cookie policy - TechJournal",
  description: "Informativa sulla privacy e cookie policy di TechJournal. GDPR e consenso cookie.",
  alternates: { canonical },
  openGraph: {
    title: "Privacy e Cookie policy | TechJournal",
    description: "Informativa sulla privacy e cookie policy di TechJournal. GDPR e consenso cookie.",
    url: canonical,
    siteName: "TechJournal",
    type: "website",
  },
  twitter: { card: "summary", title: "Privacy e Cookie | TechJournal", description: "Privacy e cookie policy TechJournal." },
};

const DEFAULT_PRIVACY_PATH = "https://www.iubenda.com/privacy-policy";
const useGoogleCmp = process.env.NEXT_PUBLIC_CONSENT_PROVIDER === "google";

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

function getPolicyId(): string | null {
  return process.env.NEXT_PUBLIC_IUBENDA_SITE_ID?.trim() ?? null;
}

export default function PrivacyPage() {
  const privacyUrl = useGoogleCmp
    ? process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL?.trim() ?? null
    : getPrivacyUrl();
  const cookieUrl = useGoogleCmp
    ? process.env.NEXT_PUBLIC_COOKIE_POLICY_URL?.trim() ?? null
    : getCookiePolicyUrl();
  const policyId = useGoogleCmp ? null : getPolicyId();
  const hasAny = policyId || privacyUrl || cookieUrl;

  return (
    <div className="max-w-3xl mx-auto px-0 md:px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-8">Privacy e Cookie policy</h1>
      <section id="newsletter" className="mb-10 scroll-mt-24 space-y-3 text-sm leading-6 text-muted">
        <h2 className="text-xl font-semibold text-foreground">Newsletter e tracciamento nelle email</h2>
        <p>
          Quando ti iscrivi, TechJournal usa il tuo indirizzo email per inviarti la newsletter
          richiesta tramite Brevo. L’indirizzo viene conservato fino alla disiscrizione; la prova
          delle preferenze espresse può essere conservata per adempiere agli obblighi di legge.
        </p>
        <p>
          Solo se presti il consenso facoltativo, le email possono contenere pixel e link
          personalizzati che associano al tuo contatto aperture e clic, insieme a dati tecnici
          come data e ora, indirizzo IP, dispositivo e client di posta. Usiamo queste informazioni
          per misurare e migliorare contenuti, frequenza e prestazioni della newsletter.
        </p>
        <p>
          Il rifiuto non limita la newsletter. Puoi revocare soltanto il tracciamento dal link
          presente nel footer di ogni email, continuando a riceverla, oppure puoi disiscriverti
          del tutto. La revoca vale per gli invii successivi.
        </p>
      </section>
      {hasAny ? (
        <div className="space-y-10 text-muted">
          {policyId && privacyUrl && (
            <IubendaPolicyContent
              policyId={policyId}
              type="privacy"
              fallbackUrl={privacyUrl}
              title="Informativa sulla privacy"
            />
          )}
          {!policyId && privacyUrl && (
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-2">Informativa sulla privacy</h2>
              <p>
                <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Visualizza su iubenda
                </a>
                {" · "}
                <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">
                  Apri in nuova scheda
                </a>
              </p>
            </section>
          )}
          {policyId && cookieUrl && (
            <IubendaPolicyContent
              policyId={policyId}
              type="cookie"
              fallbackUrl={cookieUrl}
              title="Cookie policy"
              showIubendaButtons
            />
          )}
          {!policyId && cookieUrl && (
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-2">Cookie policy</h2>
              <p>
                <a href={cookieUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Apri in nuova scheda
                </a>
              </p>
            </section>
          )}
        </div>
      ) : (
        <div className="prose prose-invert max-w-none text-muted space-y-4">
          <p>
            TechJournal rispetta la tua privacy. I dati raccolti (es. tramite cookie, newsletter,
            analytics) sono trattati nel rispetto del Regolamento UE 2016/679 (GDPR) e della
            normativa italiana.
          </p>
          <p>
            Per l’informativa completa e la cookie policy configura gli URL delle policy nel file
            di ambiente oppure contatta il titolare indicato nel footer.
          </p>
        </div>
      )}
      <Link href="/" className="inline-block mt-8 text-accent hover:underline text-sm">
        ← Torna alla home
      </Link>
    </div>
  );
}
