import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "./Skeleton";

/** Skeleton dell'header per streaming: mostrato mentre Header carica i dati da WordPress. */
export default function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-header-bg pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-[10px] sm:px-4 xl:px-12">
        <div className="flex items-center justify-between py-3 gap-2">
          <div className="md:hidden w-10 h-10 shrink-0">
            <Skeleton className="w-full h-full rounded" />
          </div>
          <Link href="/" className="flex items-center shrink-0 min-w-0" aria-label="TechJournal">
            <Image
              src="/techjournal-logo-grey.png"
              alt=""
              width={1640}
              height={263}
              className="h-9 w-auto object-contain dark:hidden"
              priority
              aria-hidden
            />
            <Image src="/techjournal-logo.png" alt="" width={1645} height={265} className="hidden h-9 w-auto object-contain dark:block" priority aria-hidden />
          </Link>
          <div className="flex items-center gap-4 shrink-0">
            <Skeleton className="w-6 h-6 rounded" />
            <Skeleton className="w-6 h-6 rounded" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </div>
        <nav className="hidden md:flex gap-6 py-3 border-t border-border">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-4 w-16" />
          ))}
        </nav>
      </div>
    </header>
  );
}
