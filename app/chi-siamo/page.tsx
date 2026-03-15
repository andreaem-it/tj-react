import Link from "next/link";

export const metadata = {
  title: "Chi siamo",
  description:
    "TechJournal è un progetto indipendente su Apple, tech e gadget. Chi siamo, come lavoriamo e come collaborare.",
};

export default function ChiSiamoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Chi siamo</h1>
      <div className="prose prose-invert max-w-none text-muted space-y-5">
        <p>
          <strong className="text-foreground">TechJournal</strong> è un progetto editoriale
          indipendente nato dalla passione per la tecnologia, l’ecosistema Apple, il gaming e la
          smart home. È stato fondato da <strong className="text-foreground">Andrea Emili</strong>{" "}
          come spazio per condividere notizie, approfondimenti e opinioni in modo diretto e
          trasparente.
        </p>
        <p>
          TechJournal <strong className="text-foreground">non costituisce testata giornalistica</strong>{" "}
          ai sensi della legge 8 febbraio 1948, n. 47 (disciplina in materia di stampa). I
          contenuti pubblicati hanno finalità informative e di intrattenimento; non si intende
          sostituire in alcun modo testate registrate o organi di informazione istituzionali.
        </p>
        <p>
          Quando un’informazione proviene da una <strong className="text-foreground">fonte certa e
          verificabile</strong>, essa viene citata e riportata in modo esplicito. Quando non è
          possibile attribuire una fonte esterna, i contenuti riflettono esperienze personali,
          opinioni degli autori o elaborazioni redazionali, e vengono presentati come tali per
          garantire chiarezza verso i lettori.
        </p>
        <p>
          Il team di TechJournal è sempre alla ricerca di <strong className="text-foreground">
          collaboratori</strong> appassionati di tecnologia che vogliano contribuire con articoli,
          recensioni o rubriche. I collaboratori vengono retribuiti con rimborsi in base a criteri
          chiari e trasparenti, descritti nella sezione{" "}
          <Link href="/lavora-con-noi" className="text-accent hover:underline">
            Lavora con noi
          </Link>
          . Invitiamo chi fosse interessato a consultare quella pagina e a candidarsi tramite i
          canali indicati.
        </p>
        <p>
          Per proposte commerciali, collaborazioni o semplicemente per scriverci, puoi usare la
          pagina <Link href="/contatti" className="text-accent hover:underline">Contatti</Link>.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/lavora-con-noi" className="text-accent hover:underline text-sm font-medium">
          Lavora con noi →
        </Link>
        <Link href="/contatti" className="text-accent hover:underline text-sm font-medium">
          Contatti →
        </Link>
        <Link href="/" className="text-accent hover:underline text-sm">
          ← Torna alla home
        </Link>
      </div>
    </div>
  );
}
