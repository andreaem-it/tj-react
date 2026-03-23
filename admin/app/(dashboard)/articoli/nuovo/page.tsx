import type { Metadata } from "next";
import Link from "next/link";
import ArticoloForm from "../ArticoloForm";

export const metadata: Metadata = {
  title: "Nuovo articolo",
  description: "Crea articolo – TechJournal Admin",
};

export default function AdminArticoloNuovoPage() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/articoli"
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          ← Articoli
        </Link>
        <h1 className="text-2xl font-semibold">Nuovo articolo</h1>
      </div>
      <ArticoloForm />
    </div>
  );
}
