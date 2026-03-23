import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: { default: "TechJournal Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`dark ${inter.variable}`}>
      <body className="min-h-screen antialiased bg-[#1a1a1a] text-white flex flex-col">
        {children}
      </body>
    </html>
  );
}
