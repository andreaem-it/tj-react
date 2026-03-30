import Link from "next/link";
import { getCompatibilityAdminSession } from "@/lib/compatibility/authServer";

export default async function AdminCompatibilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCompatibilityAdminSession();

  if (!session) {
    return (
      <div className="w-full max-w-lg mx-auto py-16 px-4">
        <h1 className="text-xl font-bold mb-2">Compatibilità — area riservata</h1>
        <p className="text-sm text-[var(--muted)] mb-4">
          Serve la sessione admin (stesso cookie JWT usato per il pannello articoli:{" "}
          <code className="text-xs bg-[var(--surface-overlay)] px-1 rounded">admin_session</code>
          ). Effettua il login dal flusso admin del sito, poi torna qui.
        </p>
        <Link href="/compatibility" className="text-[var(--accent)] text-sm underline">
          Torna alla compatibilità pubblica
        </Link>
      </div>
    );
  }

  const nav = [
    { href: "/admin/compatibility/devices", label: "Dispositivi" },
    { href: "/admin/compatibility/os", label: "OS" },
    { href: "/admin/compatibility/matrix", label: "Matrice" },
  ];

  return (
    <div className="w-full max-w-5xl py-8 px-2 sm:px-0">
      <p className="text-xs text-[var(--muted)] mb-2">
        Accesso come <span className="text-[var(--foreground)]">{session.user}</span>
      </p>
      <h1 className="text-2xl font-bold mb-6">Admin · compatibilità Apple</h1>
      <nav className="flex flex-wrap gap-2 mb-8 border-b border-[var(--border)] pb-4">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-overlay)]"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/compatibility"
          className="ml-auto text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Vista pubblica →
        </Link>
      </nav>
      {children}
    </div>
  );
}
