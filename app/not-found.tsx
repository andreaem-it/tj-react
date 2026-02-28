import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-white mb-2">404 - Pagina non trovata</h1>
      <p className="text-muted mb-6">L’articolo o la pagina richiesta non esiste.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-accent text-white font-medium rounded hover:opacity-90"
      >
        Torna alla Home
      </Link>
    </div>
  );
}
