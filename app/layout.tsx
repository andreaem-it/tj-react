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
