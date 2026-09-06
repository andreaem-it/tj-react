import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative z-10 bg-header-bg border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-[10px] sm:px-4 xl:px-12 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex min-h-11 items-center shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="TechJournal">
            <Image src="/techjournal-logo-grey.png" alt="" width={1640} height={263} className="h-7 w-auto object-contain dark:hidden" aria-hidden />
            <Image src="/techjournal-logo.png" alt="" width={1645} height={265} className="hidden h-7 w-auto object-contain dark:block" aria-hidden />
          </Link>
          <p className="text-muted text-sm">
            © {new Date().getFullYear()} TechJournal. Tutti i diritti riservati.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6" aria-label="Link utili">
            <Link href="/chi-siamo" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Chi siamo
            </Link>
            <Link href="/contatti" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Contatti
            </Link>
            <Link href="/topic" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Argomenti
            </Link>
            <Link href="/personale" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Area personale
            </Link>
            <Link href="/compatibility" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Compatibilità Apple
            </Link>
            <Link href="/lavora-con-noi" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Lavora con noi
            </Link>
            <Link href="/politica-editoriale" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Politica editoriale
            </Link>
            <Link href="/correzioni" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Correzioni
            </Link>
            <Link href="/fonti" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Fonti
            </Link>
            <Link href="/ai-e-automazione" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
              Automazione e AI
            </Link>
            <Link href="/privacy" className="inline-flex min-h-11 items-center text-muted hover:text-accent transition-colors text-sm" prefetch={false}>
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
