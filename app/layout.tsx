import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import IubendaProviderWrapper from "@/components/IubendaProviderWrapper";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import MicrosoftClarity from "@/components/MicrosoftClarity";
import AdSenseScript from "@/components/AdSenseScript";
import AppShell from "@/components/AppShell";
import SiteStructuredData from "@/components/SiteStructuredData";
import GoogleAnalyticsPageView from "@/components/GoogleAnalyticsPageView";
import DeferredTelemetry from "@/components/DeferredTelemetry";
import { shouldProxyThirdPartyScripts } from "@/lib/thirdPartyScriptUrls";
import { SITE_THEME_BOOTSTRAP_SCRIPT } from "@/lib/siteTheme";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.techjournal.it";

/** Next.js 14+: themeColor va in viewport, non in metadata (evita warning in runtime). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};

export const metadata: Metadata = {
  applicationName: "TechJournal",
  title: {
    default: "TechJournal - Notizie su Apple, Tech e Gadget",
    template: "%s | TechJournal",
  },
  description: "Ultime notizie su Apple, iPhone, Mac, app e tecnologia.",
  metadataBase: new URL(siteUrl),
  alternates: {
    types: {
      "application/rss+xml": `${siteUrl.replace(/\/$/, "")}/feed.xml`,
    },
  },
  // Open Graph: solo siteName e locale in layout. Ogni pagina definisce titolo, descrizione e url
  // per evitare meta og:description duplicati (un solo set per pagina).
  openGraph: {
    siteName: "TechJournal",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  /**
   * Il manifest esisteva in `public/` ma **nessuna pagina lo dichiarava**, quindi
   * il browser non lo scaricava mai e il sito non era installabile. Dichiararlo
   * è ciò che lo rende attivo.
   */
  manifest: "/manifest.webmanifest",
  /** Icone servite da /public (affidabili, niente dipendenze da domini esterni). */
  icons: {
    icon: [{ url: "/techjournal-favicon.png", type: "image/png", sizes: "1135x1069" }],
    shortcut: [{ url: "/techjournal-favicon.png", type: "image/png" }],
    apple: [{ url: "/techjournal-favicon.png", type: "image/png", sizes: "1135x1069" }],
  },
  appleWebApp: {
    capable: true,
    title: "TechJournal",
    statusBarStyle: "black-translucent",
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const proxyThirdPartyScripts = shouldProxyThirdPartyScripts();

  return (
    <html lang="it" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SITE_THEME_BOOTSTRAP_SCRIPT }} />
        {!proxyThirdPartyScripts && (
          <>
            <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="" />
            <link rel="dns-prefetch" href="//pagead2.googlesyndication.com" />
            <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
            <link rel="dns-prefetch" href="//www.googletagmanager.com" />
            <link rel="preconnect" href="https://www.clarity.ms" crossOrigin="" />
            <link rel="dns-prefetch" href="//www.clarity.ms" />
          </>
        )}
        <link rel="preconnect" href="https://region1.google-analytics.com" crossOrigin="" />
        <link rel="dns-prefetch" href="//region1.google-analytics.com" />
        <link rel="preconnect" href="https://cs.iubenda.com" crossOrigin="" />
        <link rel="dns-prefetch" href="//cs.iubenda.com" />
        <link rel="preconnect" href="https://idb.iubenda.com" crossOrigin="" />
        <link rel="dns-prefetch" href="//idb.iubenda.com" />
        <link rel="preconnect" href="https://static.techjournal.it" crossOrigin="" />
        <link rel="dns-prefetch" href="//static.techjournal.it" />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased font-sans">
        <svg className="liquid-glass-filter" width="0" height="0" aria-hidden="true" focusable="false">
          <filter id="liquid-glass" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.015"
              numOctaves="2"
              seed="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="24"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
        <a
          href="#main-content"
          className="fixed -top-20 left-4 z-[200] rounded-lg bg-accent px-4 py-3 font-semibold text-gray-900 shadow-lg transition-[top] focus:top-4"
        >
          Salta al contenuto
        </a>
        <IubendaProviderWrapper />
        <SiteStructuredData />
        <GoogleAnalytics />
        <MicrosoftClarity />
        <GoogleAnalyticsPageView />
        <AdSenseScript />
        <AppShell>{children}</AppShell>
        <DeferredTelemetry />
      </body>
    </html>
  );
}
