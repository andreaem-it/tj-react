import { fetchCategories, fetchPosts, getCategoryIdsIncludingChildren } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const perPage = Number(searchParams.get("per_page")) || 10;
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
  });
  return NextResponse.json({ posts, totalPages });
}
