import type { Metadata } from "next";
import Link from "next/link";
import ArticoliList from "./ArticoliList";

export const metadata: Metadata = {
  title: "Articoli",
  description: "Gestione articoli – TechJournal Admin",
};

export default function AdminArticoliPage() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold">Articoli</h1>
        <Link
          href="/articoli/nuovo"
          className="px-4 py-2 rounded-lg bg-[#f5a623] text-[#1a1a1a] font-medium hover:bg-[#e09520] transition-colors"
        >
          Nuovo articolo
        </Link>
      </div>
      <ArticoliList />
    </div>
  );
}
