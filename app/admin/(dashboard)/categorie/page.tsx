import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categorie",
  description: "Gestione categorie – TechJournal Admin",
};

export default function AdminCategoriePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Categorie</h1>
      <p className="text-white/60">
        Lista categorie e sincronizzazione da WordPress in arrivo.
      </p>
    </div>
  );
}
