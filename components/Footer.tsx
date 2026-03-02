import Image from "next/image";
import Link from "next/link";

const LOGO_URL = "https://static.techjournal.it/2024/01/logo-techjournal-250.png";

export default function Footer() {
  return (
    <footer className="bg-header-bg border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0">
            <Image src={LOGO_URL} alt="TechJournal" width={150} height={30} className="h-7 w-auto object-contain" />
          </Link>
          <p className="text-muted text-sm">
            © {new Date().getFullYear()} TechJournal. Tutti i diritti riservati.
          </p>
          <div className="flex gap-6">
            <a
              href="https://www.facebook.com/techjournal.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent transition-colors text-sm"
            >
              Facebook
            </a>
            <a
              href="https://www.instagram.com/techjournal.it"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent transition-colors text-sm"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
