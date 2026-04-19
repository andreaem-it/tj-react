import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import IubendaProviderWrapper from "@/components/IubendaProviderWrapper";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AdSenseScript from "@/components/AdSenseScript";
import AppShell from "@/components/AppShell";
import SiteStructuredData from "@/components/SiteStructuredData";
import GoogleAnalyticsPageView from "@/components/GoogleAnalyticsPageView";
import DeferredTelemetry from "@/components/DeferredTelemetry";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.techjournal.it";

/** Next.js 14+: themeColor va in viewport, non in metadata (evita warning in runtime). */
export const viewport: Viewport = {
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
  keywords: [
    "Apple",
    "iPhone",
    "Mac",
    "tech",
    "notizie",
    "gadget",
    "app",
    "TechJournal",
  ],
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
  /** Icone servite da /public (affidabili, niente dipendenze da domini esterni). */
  icons: {
    icon: [{ url: "/techjournal-ico.svg", type: "image/svg+xml" }],
    apple: [{ url: "/techjournal-ico.svg", type: "image/svg+xml" }],
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
  return (
    <html lang="it" className={`dark ${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="" />
        <link rel="dns-prefetch" href="//pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" crossOrigin="" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
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
        <IubendaProviderWrapper />
        <SiteStructuredData />
        <GoogleAnalytics />
        <GoogleAnalyticsPageView />
        <AdSenseScript />
        <AppShell>{children}</AppShell>
        <DeferredTelemetry />
      </body>
    </html>
  );
}
