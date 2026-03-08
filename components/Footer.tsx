import Image from "next/image";
import Link from "next/link";

const LOGO_URL = "https://static.techjournal.it/2024/01/logo-techjournal-250.png";

export default function Footer() {
  return (
    <footer className="bg-header-bg border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-2.5 md:px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0">
            <Image src={LOGO_URL} alt="TechJournal" width={150} height={30} className="h-7 w-auto object-contain" />
          </Link>
          <p className="text-muted text-sm">
            © {new Date().getFullYear()} TechJournal. Tutti i diritti riservati.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <Link href="/chi-siamo" className="text-muted hover:text-accent transition-colors text-sm">
              Chi siamo
            </Link>
            <Link href="/contatti" className="text-muted hover:text-accent transition-colors text-sm">
              Contatti
            </Link>
            <Link href="/privacy" className="text-muted hover:text-accent transition-colors text-sm">
              Privacy
            </Link>
            <Link href="/cookie-policy" className="text-muted hover:text-accent transition-colors text-sm">
              Cookie
            </Link>
            <Link href="/termini" className="text-muted hover:text-accent transition-colors text-sm">
              Termini
            </Link>
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
        <p className="text-muted text-xs mt-6 pt-6 border-t border-border w-full text-center">
          <strong>TechJournal</strong> è un blog personale e non è iscritto
          come testata giornalistica. I contenuti pubblicati hanno scopo informativo e di intrattenimento; le
          informazioni riportate potrebbero non essere verificate o aggiornate. <br/>Le opinioni espresse sono
          esclusivamente degli autori. Non si assume alcuna responsabilità per eventuali errori, omissioni o
          reclami relativi ai contenuti del sito. <br/>Per questioni legali o commerciali contattare il titolare.
        </p>
      </div>
    </footer>
  );
}
