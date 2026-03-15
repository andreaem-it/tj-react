"use client";

import Script from "next/script";

/**
 * Carica iubenda.js dopo che i link .iubenda-embed sono nel DOM.
 * Va usato nella stessa pagina degli IubendaPolicyEmbed, dopo i link nel markup,
 * così quando lo script esegue trova già gli anchor e attacca l'overlay.
 */
export default function IubendaEmbedScript() {
  return (
    <Script
      id="iubenda-embed-js"
      src="https://cdn.iubenda.com/iubenda.js"
      strategy="afterInteractive"
    />
  );
}
