"use client";

import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { MegamenuPost } from "./NavBar";

interface HeaderClientProps {
  categoryLinks?: Record<string, string>;
  megamenuBySlug: Record<string, MegamenuPost[]>;
}

function TechJournalLogo() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2048 408"
      className="h-9 w-auto object-contain"
      role="img"
      aria-label="TechJournal"
    >
      <path d="M0 0h2048v408H0z" />
      <path
        fill="#febb00"
        d="M960.8 335.3c16.8-.7 37.1-.2 54.1-.2h99.4l300.5.1 369.9-.1c62.3 0 124.6-.1 186.9.1 11.3 0 20.2 5.9 21.8 17.7.7 5.6-.9 11.2-4.3 15.7-4.2 5.3-8.5 7.2-15 7.9l-678.7-.1-220.5-.1-69.7.1c-13.9 0-27.7.2-41.5-.4-10.3-.4-14-5.1-20.6-12.7-.3-4.5 0-10.7.1-15.4 4.3-6.2 10.3-10.7 17.6-12.7z"
      />
      <path
        fill="#febb00"
        d="M636.8 106.3c15.6-1.3 37.3-1.2 52.9.9 4.6 1.1 4 4.2 4.1 7.5.2 7.9-2.1 97.4-2.3 96.9 8.8 2.4 18.3-12.5 27.5-16.7 32.3-14.6 68.7-5.1 85.2 26.9 3.8 7.3 6.2 15.3 7.2 23.5.9 7.4 2 125.6 1 128.8-1.6 2.3-3.5 3.9-6.2 4.4-6.6 1.1-45.5.5-48.9-1.4-3.2-3.6-1.6-53.3-1.6-61.2.2-26.7 8.5-82.8-32.7-80.2-33.9 2.1-30.4 38.6-30.2 62.9.2 22.7-.4 45.5 1.2 68.2.7 8.9-2.1 12.2-11.6 12.3-2.5-.4-8.2.1-10.3-.5-8-2.2-38.4 6-37.8-7.4.5-11.1.6-22.5.6-33.1l.1-100.1-.1-98.3c-.1-9.4-.2-18.4-1-27.8-.3-2.8 1-3.5 2.7-5.3z"
      />
      <path
        fill="#7e7a73"
        d="M1053.3 111.4c.5-.1 1.1-.1 1.6-.2 21.3-2.1 47.8 4.8 65 19 39.3 32.4 42.3 98.4 14 139-14.6 20.9-38.9 32.1-64.7 34.6-24.4 1.7-44.8-1.6-64.8-16.7-54-40.8-45.5-141.7 18.8-168.3 10.5-4.3 18.9-5.7 30.1-7.4z"
      />
      <path fill="none" d="M1056.4 134.2c79.5-4.1 84.7 141 6 146.3-67.3 6.8-90-130.7-6-146.3z"/>
    </svg>
  );
}

function DesktopNavFallback() {
  return (
    <nav className="hidden md:flex items-center gap-6 py-3 border-t border-border flex-wrap">
      <Link href="/" className="text-foreground hover:text-accent transition-colors text-base font-medium py-1">
        Ultime Notizie
      </Link>
      <Link href="/apple" className="text-foreground hover:text-accent transition-colors text-base font-medium py-1">
        Apple
      </Link>
      <Link href="/apps" className="text-foreground hover:text-accent transition-colors text-base font-medium py-1">
        Apps
      </Link>
      <Link href="/tech" className="text-foreground hover:text-accent transition-colors text-base font-medium py-1">
        Tech
      </Link>
      <Link href="/gaming" className="text-foreground hover:text-accent transition-colors text-base font-medium py-1">
        Gaming
      </Link>
      <Link href="/search" className="ml-auto text-foreground hover:text-accent transition-colors p-1" aria-label="Cerca">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </Link>
    </nav>
  );
}

const NavBar = dynamic(() => import("./NavBar"), {
  loading: () => <DesktopNavFallback />,
});
const ThemeToggle = dynamic(() => import("./ThemeToggle"), {
  loading: () => (
    <span
      className="inline-flex items-center justify-center rounded-full border border-border bg-surface-overlay p-2 text-foreground"
      aria-hidden
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </span>
  ),
});

export default function HeaderClient({ categoryLinks, megamenuBySlug }: HeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-header-bg border-b border-border">
      <div className="max-w-7xl mx-auto px-[10px] sm:px-4 xl:px-12">
        <div className="flex items-center justify-between py-3 gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden flex items-center justify-center p-2 text-foreground hover:text-accent transition-colors shrink-0"
            aria-label="Apri menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="flex items-center shrink-0 min-w-0">
            <TechJournalLogo />
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://www.facebook.com/techjournal.it"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex text-foreground hover:text-accent transition-colors"
              aria-label="Facebook"
            >
              <span className="text-lg font-semibold">f</span>
            </a>
            <a
              href="https://www.instagram.com/techjournal.it"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex text-foreground hover:text-accent transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <ThemeToggle />
          </div>
        </div>
        <NavBar
          categoryLinks={categoryLinks}
          megamenuBySlug={megamenuBySlug}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
      </div>
    </header>
  );
}
