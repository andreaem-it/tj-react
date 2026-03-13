import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "./Skeleton";

const LOGO_URL = "https://static.techjournal.it/2024/01/logo-techjournal-250.png";

/** Skeleton dell'header per streaming: mostrato mentre Header carica i dati da WordPress. */
export default function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 bg-header-bg border-b border-border">
      <div className="max-w-7xl mx-auto px-2.5 md:px-4">
        <div className="flex items-center justify-between py-3 gap-2">
          <div className="md:hidden w-10 h-10 shrink-0">
            <Skeleton className="w-full h-full rounded" />
          </div>
          <Link href="/" className="flex items-center shrink-0 min-w-0">
            <Image
              src={LOGO_URL}
              alt="TechJournal"
              width={250}
              height={50}
              className="h-9 w-auto object-contain"
              priority
            />
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
