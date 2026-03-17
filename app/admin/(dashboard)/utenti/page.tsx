import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Utenti",
  description: "Gestione utenti – TechJournal Admin",
};

export default function AdminUtentiPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Utenti</h1>
      <p className="text-white/60">
        Gestione utenti admin in arrivo.
      </p>
    </div>
  );
}
