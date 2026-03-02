import { fetchCategories, fetchPosts, getCategoryIdsIncludingChildren } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const perPage = Number(searchParams.get("per_page")) || 10;
  const alreadyParam = searchParams.get("already");
  const page =
    alreadyParam !== null && alreadyParam !== ""
      ? Math.max(1, Math.floor(Number(alreadyParam) / perPage) + 1)
      : Number(searchParams.get("page")) || 1;
  const categoryParam = searchParams.get("category");
  const categoryIdNum = categoryParam ? Number(categoryParam) : NaN;
  const categoryId = Number.isInteger(categoryIdNum) && categoryIdNum > 0 ? categoryIdNum : undefined;
  const categoryIds =
    categoryId != null
      ? getCategoryIdsIncludingChildren(await fetchCategories(), categoryId)
      : undefined;
  const { posts, totalPages } = await fetchPosts({
    page,
    perPage,
    categoryIds,
    requestCache: "no-store",
  });
  const res = NextResponse.json({ posts, totalPages });
  res.headers.set("X-Next-Page", String(page));
  res.headers.set("X-Next-Already", alreadyParam ?? "");
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  return res;
}
