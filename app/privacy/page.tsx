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
  const privacyUrl = getPrivacyUrl();
  const cookieUrl = getCookiePolicyUrl();
  const policyId = getPolicyId();
  const hasAny = policyId || privacyUrl || cookieUrl;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-8">Privacy e Cookie policy</h1>
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
            Per l’informativa completa e la cookie policy configura{" "}
            <code className="text-foreground">NEXT_PUBLIC_IUBENDA_SITE_ID</code> e{" "}
            <code className="text-foreground">NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID</code> in .env
            oppure contatta il titolare indicato nel footer.
          </p>
        </div>
      )}
      <Link href="/" className="inline-block mt-8 text-accent hover:underline text-sm">
        ← Torna alla home
      </Link>
    </div>
  );
}
