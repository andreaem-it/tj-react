import { notFound } from "next/navigation";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/featureFlags";

/**
 * Kill switch server-side per un intero segmento dell'App Router.
 *
 * `notFound()` evita di esporre una pagina spenta e aggiunge automaticamente
 * `noindex`; i flag sono letti solo sul server e non finiscono nel bundle client.
 */
export default function FeatureGate({
  children,
  flag,
}: {
  children: React.ReactNode;
  flag: FeatureFlag;
}) {
  if (!isFeatureEnabled(flag)) notFound();
  return children;
}
