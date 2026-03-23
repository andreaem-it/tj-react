import type { Metadata } from "next";
import Link from "next/link";
import ArticoloForm from "../../ArticoloForm";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Modifica articolo",
  description: "Modifica articolo – TechJournal Admin",
};

export default async function AdminArticoloEditPage({ params }: Props) {
  const { id } = await params;
  const articleId = Number(id);
  if (!Number.isInteger(articleId) || articleId < 1) {
    return (
      <div>
        <p className="text-red-400">ID non valido.</p>
        <Link href="/articoli" className="text-[#f5a623] hover:underline mt-2 inline-block">
          ← Torna agli articoli
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/articoli"
          className="text-white/60 hover:text-white text-sm transition-colors"
        >
          ← Articoli
        </Link>
        <h1 className="text-2xl font-semibold">Modifica articolo</h1>
      </div>
      <ArticoloForm articleId={articleId} />
    </div>
  );
}
