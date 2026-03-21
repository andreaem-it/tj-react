import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import HeaderSkeleton from "@/components/HeaderSkeleton";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import BannerPlaceholder from "@/components/BannerPlaceholder";
import NewsletterModal from "@/components/NewsletterModal";
import IubendaProviderWrapper from "@/components/IubendaProviderWrapper";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import TrackingConsentGate from "@/components/TrackingConsentGate";
import AdSenseScript from "@/components/AdSenseScript";
import AppShell from "@/components/AppShell";
import SiteStructuredData from "@/components/SiteStructuredData";
import GoogleAnalyticsPageView from "@/components/GoogleAnalyticsPageView";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.techjournal.it";

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
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
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased font-sans">
        <IubendaProviderWrapper>
          <SiteStructuredData />
          <GoogleAnalytics />
          <GoogleAnalyticsPageView />
          <TrackingConsentGate />
          <AdSenseScript />
          <AppShell>{children}</AppShell>
          <Analytics />
          <SpeedInsights />
        </IubendaProviderWrapper>
      </body>
    </html>
  );
}
