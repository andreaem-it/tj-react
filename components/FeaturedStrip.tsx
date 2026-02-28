import ArticleCard from "./ArticleCard";
import type { PostWithMeta } from "@/lib/api";

interface FeaturedStripProps {
  posts: PostWithMeta[];
}

export default function FeaturedStrip({ posts }: FeaturedStripProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {posts.slice(0, 5).map((post) => (
          <div key={post.id} className="min-w-0">
            <ArticleCard post={post} variant="strip" />
          </div>
        ))}
      </div>
    </section>
  );
}
