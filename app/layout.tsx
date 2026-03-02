import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import BannerPlaceholder from "@/components/BannerPlaceholder";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TechJournal - Notizie su Apple, Tech e Gadget",
  description: "Ultime notizie su Apple, iPhone, Mac, app e tecnologia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased font-sans">
        <Header />
        <main className="flex-1 flex w-full justify-center min-w-0 px-2.5 xl:px-12 gap-6 xl:gap-10">
          <BannerPlaceholder side="left" width={160} minHeight={600} />
          <div className="flex-1 min-w-0 flex justify-center">
            {children}
          </div>
          <BannerPlaceholder side="right" width={160} minHeight={600} />
        </main>
        <Footer />
        <ScrollToTop />
      </body>
    </html>
  );
}
