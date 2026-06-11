/**
 * URL script GA/AdSense: in produzione passano dal dominio del sito (rewrite Next.js)
 * così il browser non apre TLS verso Google (evita ERR_CERT_AUTHORITY_INVALID
 * su reti con antivirus/proxy che intercettano solo domini esterni).
 *
 * La scelta proxy usa `window.location` a runtime: non basarsi solo su process.env
 * (Next/Turbopack può eliminare il ramo /3p/* a build time).
 */
export function shouldProxyThirdPartyScripts(): boolean {
  if (process.env.NEXT_PUBLIC_THIRD_PARTY_SCRIPT_PROXY === "0") return false;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return false;
    return true;
  }
  return true;
}

export function gtagJsUrl(measurementId: string): string {
  const id = encodeURIComponent(measurementId.trim());
  const direct = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  const proxied = `/3p/gtag/js?id=${id}`;
  return shouldProxyThirdPartyScripts() ? proxied : direct;
}

export function adsenseJsUrl(clientId: string): string {
  const client = encodeURIComponent(clientId.trim());
  const direct = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  const proxied = `/3p/ads/pagead/js/adsbygoogle.js?client=${client}`;
  return shouldProxyThirdPartyScripts() ? proxied : direct;
}
