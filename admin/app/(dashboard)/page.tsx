import type { Metadata } from "next";
import Link from "next/link";
import AdminDashboardStats from "./AdminDashboardStats";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Pannello di amministrazione TechJournal",
};

export default function AdminDashboardPage() {
  return <AdminDashboardStats />;
}
