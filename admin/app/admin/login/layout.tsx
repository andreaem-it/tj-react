import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionFromToken, getSessionCookieName } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (token) {
    const session = await getSessionFromToken(token);
    if (session) redirect("/admin");
  }
  return <>{children}</>;
}
