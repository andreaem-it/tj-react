import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getSessionFromToken,
  getSessionCookieName,
} from "@/lib/auth";
import AdminLogout from "@/components/AdminLogout";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) {
    redirect(`/login?from=${encodeURIComponent("/")}`);
  }
  const session = await getSessionFromToken(token);
  if (!session) {
    redirect(`/login?from=${encodeURIComponent("/")}`);
  }

  return (
    <>
      <header className="border-b border-white/10 bg-[#212121] px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="font-semibold text-lg text-white hover:text-[#f5a623] transition-colors"
        >
          TechJournal Admin
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/articoli"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Articoli
          </Link>
          <Link
            href="/media"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Media
          </Link>
          <Link
            href="/categorie"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Categorie
          </Link>
          <Link
            href="/utenti"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Utenti
          </Link>
          <AdminLogout />
        </nav>
      </header>
      <main className="flex-1 w-full px-6 py-6">{children}</main>
    </>
  );
}
