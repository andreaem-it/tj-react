import { redirect, notFound } from "next/navigation";
import { fetchCategories, getCategoryUrlSlug } from "@/lib/api";

export const revalidate = 60;

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

/** Redirect /category/[id] o /category/[slug] verso /[urlSlug] (es. /apps, /offerte). */
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;
  const idNum = Number(id);
  const isNumeric = !Number.isNaN(idNum);

  const categories = await fetchCategories();
  const cat = isNumeric
    ? categories.find((c) => c.id === idNum)
    : categories.find((c) => c.slug === id);

  if (!cat) notFound();
  redirect(`/${getCategoryUrlSlug(cat)}`);
}
