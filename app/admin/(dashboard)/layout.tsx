import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getSessionFromToken,
  getSessionCookieName,
} from "@/lib/auth";
import AdminLogout from "../AdminLogout";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) {
    redirect(`/admin/login?from=${encodeURIComponent("/admin")}`);
  }
  const session = await getSessionFromToken(token);
  if (!session) {
    redirect(`/admin/login?from=${encodeURIComponent("/admin")}`);
  }

  return (
    <>
      <header className="border-b border-white/10 bg-[#212121] px-4 py-3 flex items-center justify-between">
        <Link
          href="/admin"
          className="font-semibold text-lg text-white hover:text-[#f5a623] transition-colors"
        >
          TechJournal Admin
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/admin"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/articoli"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Articoli
          </Link>
          <Link
            href="/admin/media"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Media
          </Link>
          <Link
            href="/admin/categorie"
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Categorie
          </Link>
          <Link
            href="/admin/utenti"
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
