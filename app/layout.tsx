import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import BannerPlaceholder from "@/components/BannerPlaceholder";
import NewsletterModal from "@/components/NewsletterModal";
import AdSenseScript from "@/components/AdSenseScript";
import IubendaCookieBanner from "@/components/IubendaCookieBanner";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import GoogleAnalyticsPageView from "@/components/GoogleAnalyticsPageView";

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
  openGraph: {
    siteName: "TechJournal",
    locale: "it_IT",
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
        <IubendaCookieBanner />
        <GoogleAnalytics />
        <GoogleAnalyticsPageView />
        <AdSenseScript />
        <Header />
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
      </body>
    </html>
  );
}
