import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description: "Pannello di amministrazione TechJournal",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#1a1a1a] text-white">
      {children}
    </div>
  );
}
