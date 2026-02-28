import { fetchPosts } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get("page")) || 1;
  const perPage = Number(searchParams.get("per_page")) || 10;
  const categoryId = searchParams.get("category");
  const { posts, totalPages } = await fetchPosts({
    page,
    perPage,
    categoryId: categoryId ? Number(categoryId) : undefined,
  });
  return NextResponse.json({ posts, totalPages });
}
