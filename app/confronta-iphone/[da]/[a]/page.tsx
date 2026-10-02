import type { Metadata } from "next";
import IphoneUpgradePage from "../../page";
import { SITE_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ da: string; a: string }>;
}

function comparisonCanonical(fromSlug: string, toSlug: string) {
  const base = SITE_URL.replace(/\/$/, "");
  return `${base}/confronta-iphone/${encodeURIComponent(fromSlug)}/${encodeURIComponent(toSlug)}/`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { da, a } = await params;
  const canonical = comparisonCanonical(da, a);

  return {
    title: "Conviene cambiare iPhone? Confronta due modelli",
    description:
      "Scegli il tuo iPhone e quello che vuoi acquistare: scopri se l'aggiornamento conviene, quali miglioramenti noterai e a cosa rinunceresti.",
    alternates: { canonical },
    openGraph: {
      title: "Conviene cambiare iPhone?",
      description: "Un verdetto chiaro basato sulle differenze reali fra due modelli.",
      url: canonical,
      type: "website",
    },
  };
}

export default async function IphoneUpgradeComparisonPage({ params }: PageProps) {
  const { da, a } = await params;

  return <IphoneUpgradePage searchParams={Promise.resolve({ da, a })} redirectToCleanUrl={false} />;
}
