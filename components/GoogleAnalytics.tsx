import Script from "next/script";

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

/**
 * Google Analytics 4 con Consent Mode v2.
 * Imposta NEXT_PUBLIC_GA_MEASUREMENT_ID (G-XXXXXXXXXX) in .env.local.
 * Se usi iubenda, al consenso cookie viene aggiornato il consent (analytics_storage granted).
 */
export default function GoogleAnalytics() {
  if (!measurementId) return null;

  const consentScript = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('consent', 'default', {
      'analytics_storage': 'denied',
      'ad_storage': 'denied',
      'ad_user_data': 'denied',
      'ad_personalization': 'denied',
      'wait_for_update': 500
    });
    gtag('set', 'ads_data_redaction', true);
    gtag('config', '${measurementId}', { anonymize_ip: true });
    window.__iubendaGaConsentUpdate = function() {
      if (window.gtag) {
        gtag('consent', 'update', {
          'analytics_storage': 'granted',
          'ad_storage': 'granted',
          'ad_user_data': 'granted',
          'ad_personalization': 'granted'
        });
      }
    };
  `;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-consent-config" strategy="afterInteractive">
        {consentScript}
      </Script>
    </>
  );
}
