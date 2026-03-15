"use client";

const EMBED_CLASSES =
  "iubenda-white no-brand iubenda-noiframe iubenda-embed iubenda-noiframe iub-body-embed text-accent hover:underline";

interface IubendaPolicyEmbedProps {
  /** URL completo della policy (es. https://www.iubenda.com/privacy-policy/40447530) */
  href: string;
  /** Titolo per l’attributo title e accessibilità */
  title: string;
  /** Testo del link (default: title) */
  children?: React.ReactNode;
}

/**
 * Link iubenda che apre la policy in embed (overlay) invece di navigare via.
 * Richiede lo script iubenda.js; le classi iubenda-embed vengono gestite dallo script.
 */
export default function IubendaPolicyEmbed({ href, title, children }: IubendaPolicyEmbedProps) {
  return (
    <a href={href} className={EMBED_CLASSES} title={title}>
      {children ?? title}
    </a>
  );
}
