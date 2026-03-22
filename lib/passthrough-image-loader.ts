/**
 * Bypass dell’Image Optimization di Vercel (`/_next/image`).
 * Senza questo, con quote esaurite o piano senza ottimizzazione si riceve 402 Payment Required.
 *
 * Restituisce sempre l’URL originale (locale o remoto); niente ridimensionamento lato edge.
 */
export default function passthroughImageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src) return src;
  if (src.startsWith("/") || src.startsWith("data:") || src.startsWith("blob:")) {
    return src;
  }
  try {
    return new URL(src).toString();
  } catch {
    return src;
  }
}
