import Link from "next/link";
import { SITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

const canonical = `${SITE_URL.replace(/\/$/, "")}/contatti`;

export const metadata: Metadata = {
  title: "Contatti - Collaborazioni e informazioni TechJournal",
  description: "Contatta TechJournal per collaborazioni, informazioni e partnership. Apple, tech e gadget.",
  alternates: { canonical },
  openGraph: {
    title: "Contatti - Collaborazioni | TechJournal",
    description: "Contatta TechJournal per collaborazioni e informazioni.",
    url: canonical,
    siteName: "TechJournal",
    type: "website",
  },
  twitter: { card: "summary", title: "Contatti | TechJournal", description: "Contatti TechJournal per collaborazioni." },
};

export default function ContattiPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <div className="max-w-3xl mx-auto px-0 md:px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Contatti</h1>
      <div className="prose prose-invert max-w-none text-muted space-y-4">
        <p>
          Per questioni legali, commerciali o di collaborazione puoi contattare il titolare di
          TechJournal.
        </p>
        {contactEmail ? (
          <p>
            Email:{" "}
            <a href={`mailto:${contactEmail}`} className="text-accent hover:underline">
              {contactEmail}
            </a>
          </p>
        ) : (
          <p>
            Configura <code className="text-foreground">NEXT_PUBLIC_CONTACT_EMAIL</code> in
            .env.local per mostrare qui l’indirizzo email di contatto.
          </p>
        )}
      </div>
      <Link href="/" className="inline-block mt-6 text-accent hover:underline text-sm">
        ← Torna alla home
      </Link>
    </div>
  );
}
