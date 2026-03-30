import Image from "next/image";
import Link from "next/link";

const LOGO_URL = "https://static.techjournal.it/2024/01/logo-techjournal-250.png";

export default function Footer() {
  return (
    <footer className="relative z-10 bg-header-bg border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-[10px] sm:px-4 xl:px-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center shrink-0">
            <Image src={LOGO_URL} alt="TechJournal" width={150} height={30} className="h-7 w-auto object-contain" />
          </Link>
          <p className="text-muted text-sm">
            © {new Date().getFullYear()} TechJournal. Tutti i diritti riservati.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6" aria-label="Link utili">
            <Link href="/chi-siamo" className="text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Chi siamo
            </Link>
            <Link href="/contatti" className="text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Contatti
            </Link>
            <Link href="/compatibility" className="text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Compatibilità Apple
            </Link>
            <Link href="/lavora-con-noi" className="text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Lavora con noi
            </Link>
            <Link href="/politica-editoriale" className="text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Politica editoriale
            </Link>
            <Link href="/privacy" className="text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Privacy e Cookie policy
            </Link>
          </nav>
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
