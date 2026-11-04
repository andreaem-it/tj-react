/**
 * Prepara Funding Choices e Consent Mode prima di qualsiasi tag Google.
 * Viene montato solo con NEXT_PUBLIC_CONSENT_PROVIDER=google.
 */
export default function GoogleCmpBootstrap() {
  return (
    <script
      id="google-cmp-bootstrap"
      dangerouslySetInnerHTML={{
        __html: `window.googlefc = window.googlefc || {};
window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'wait_for_update': 500
});
gtag('set', 'ads_data_redaction', true);`,
      }}
    />
  );
}
