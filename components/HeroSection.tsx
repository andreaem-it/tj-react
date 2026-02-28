import ArticleCard from "./ArticleCard";
import type { PostWithMeta } from "@/lib/api";

interface HeroSectionProps {
  posts: PostWithMeta[];
}

export default function HeroSection({ posts }: HeroSectionProps) {
  const [first, second, third] = posts;

  if (!first) return null;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
      <div className="lg:col-span-2 min-h-[280px] md:min-h-[320px]">
        <ArticleCard post={first} variant="hero" />
      </div>
      <div className="flex flex-col gap-4">
        {second && (
          <div className="flex-1 min-h-[140px] md:min-h-[160px]">
            <ArticleCard post={second} variant="hero" />
          </div>
        )}
        {third && (
          <div className="flex-1 min-h-[140px] md:min-h-[160px]">
            <ArticleCard post={third} variant="hero" />
          </div>
        )}
      </div>
    </section>
  );
}
