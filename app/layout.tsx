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
        <Suspense fallback={<HeaderSkeleton />}>
          <Header />
        </Suspense>
        <main className="flex-1 flex w-full justify-center min-w-0 min-h-0 px-2.5 xl:px-12 gap-6 xl:gap-10">
          <BannerPlaceholder
            side="left"
            width={160}
            minHeight={600}
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER_LEFT}
          />
          <div className="flex-1 min-w-0 flex justify-center">
            {children}
          </div>
          <BannerPlaceholder
            side="right"
            width={160}
            minHeight={600}
            adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SKYSCRAPER_RIGHT}
          />
        </main>
        <Footer />
        <NewsletterModal />
        <ScrollToTop />
          <Analytics />
          <SpeedInsights />
        </IubendaProviderWrapper>
      </body>
    </html>
  );
}
