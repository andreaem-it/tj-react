import Script from "next/script";

const siteId = process.env.NEXT_PUBLIC_IUBENDA_SITE_ID?.trim();
const cookiePolicyId = process.env.NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID?.trim();
const hasGa = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim());

/**
 * Banner cookie consent iubenda (Privacy Controls and Cookie Solution).
 * Imposta NEXT_PUBLIC_IUBENDA_SITE_ID e NEXT_PUBLIC_IUBENDA_COOKIE_POLICY_ID in .env.local.
 * Gli ID si trovano in iubenda Dashboard → Privacy Controls and Cookie Solution → Embed.
 */
export default function IubendaCookieBanner() {
  if (!siteId || !cookiePolicyId) return null;

  const csConfiguration: Record<string, unknown> = {
    lang: process.env.NEXT_PUBLIC_IUBENDA_LANG ?? "it",
    siteId: Number(siteId),
    cookiePolicyId: Number(cookiePolicyId),
    enableGdpr: true,
    gdprAppliesGlobally: true,
    perPurposeConsent: true,
    banner: {
      position: "bottom" as const,
      acceptButtonDisplay: true,
      customizeButtonDisplay: true,
      rejectButtonDisplay: true,
      listPurposes: true,
      showPurposesToggles: true,
    },
  };
  if (hasGa) {
    csConfiguration.callback = {
      onConsentGiven: "__iubendaGaConsentUpdate",
    };
  }

  const configScript = `var _iub = _iub || []; _iub.csConfiguration = ${JSON.stringify(csConfiguration)};`;

  return (
    <>
      <Script id="iubenda-cs-config" strategy="afterInteractive">
        {configScript}
      </Script>
      <Script
        id="iubenda-cs-script"
        src="https://cdn.iubenda.com/cs/iubenda_cs.js"
        strategy="afterInteractive"
        charSet="UTF-8"
      />
    </>
  );
}
