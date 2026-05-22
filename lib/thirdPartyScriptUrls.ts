/**
 * URL script GA/AdSense: in produzione passano dal dominio del sito (rewrite Next.js)
 * così il browser non apre TLS verso Google (evita ERR_CERT_AUTHORITY_INVALID
 * su reti con antivirus/proxy che intercettano solo domini esterni).
 */
export function useThirdPartyScriptProxy(): boolean {
  if (process.env.NODE_ENV === "development") return false;
  return process.env.NEXT_PUBLIC_THIRD_PARTY_SCRIPT_PROXY !== "0";
}

export function gtagJsUrl(measurementId: string): string {
  const id = encodeURIComponent(measurementId.trim());
  const direct = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  if (!useThirdPartyScriptProxy()) return direct;
  return `/3p/gtag/js?id=${id}`;
}

export function adsenseJsUrl(clientId: string): string {
  const client = encodeURIComponent(clientId.trim());
  const direct = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  if (!useThirdPartyScriptProxy()) return direct;
  return `/3p/ads/pagead/js/adsbygoogle.js?client=${client}`;
}
