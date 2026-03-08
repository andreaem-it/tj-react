import Link from "next/link";

export const metadata = {
  title: "Chi siamo",
  description: "Chi siamo e cosa fa TechJournal.",
};

export default function ChiSiamoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Chi siamo</h1>
      <div className="prose prose-invert max-w-none text-muted space-y-4">
        <p>
          TechJournal è un blog dedicato a notizie, recensioni e approfondimenti su Apple, tech e
          gadget. Nasce dalla passione per la tecnologia e per l’ecosistema Apple in particolare.
        </p>
        <p>
          I contenuti hanno scopo informativo e di intrattenimento. TechJournal non è una testata
          giornalistica; le opinioni espresse sono degli autori. Per collaborazioni o contatti
          utilizza la pagina <Link href="/contatti" className="text-accent hover:underline">Contatti</Link>.
        </p>
      </div>
      <Link href="/" className="inline-block mt-6 text-accent hover:underline text-sm">
        ← Torna alla home
      </Link>
    </div>
  );
}
