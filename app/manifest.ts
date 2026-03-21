import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

/**
 * Web App Manifest (PWA light): icone, tema e nome per installazione / condivisione.
 * Next.js espone automaticamente questo file come route.
 */
export default function manifest(): MetadataRoute.Manifest {
  const base = SITE_URL.replace(/\/$/, "");

  return {
    name: "TechJournal — Notizie Apple, Tech e Gadget",
    short_name: "TechJournal",
    description:
      "Ultime notizie su Apple, iPhone, Mac, app e tecnologia. Recensioni, guide e offerte.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "browser",
    background_color: "#1a1a1a",
    theme_color: "#1a1a1a",
    lang: "it",
    icons: [
      {
        src: "/techjournal-ico.svg",
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
    ],
  };
}
