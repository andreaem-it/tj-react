import ArticleCard from "./ArticleCard";
import type { PostWithMeta } from "@/lib/api";

interface HeroSectionProps {
  posts: PostWithMeta[];
}

/**
 * Layout 3 colonne 6/12, 3/12, 3/12.
 * Colonna 1 (6/12): un elemento grande.
 * Colonna 2 (3/12): un elemento medio.
 * Colonna 3 (3/12): due elementi piccoli uno sopra l'altro.
 */
export default function HeroSection({ posts }: HeroSectionProps) {
  const [first, second, third, fourth] = posts;
  const hasFourth = Boolean(fourth);

  if (!first) return null;

  return (
    <section className="w-full mb-6 md:mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-2 gap-2 md:gap-3">
        {/* Colonna 1 (6/12): elemento grande */}
        <div className="lg:col-start-1 lg:col-span-6 lg:row-span-2 min-h-[220px] sm:min-h-[280px] lg:min-h-[320px]">
          <ArticleCard post={first} variant="hero" size="large" priority />
        </div>
        {/* Colonna 2 (3/12): elemento medio */}
        <div className="lg:col-start-7 lg:col-span-3 lg:row-span-2 min-h-[200px] sm:min-h-[240px] lg:min-h-[320px]">
          {second && <ArticleCard post={second} variant="hero" size="medium" />}
        </div>
        {/* Colonna 3 (3/12): due piccoli impilati, oppure uno solo che occupa entrambe le righe */}
        <div
          className={
            hasFourth
              ? "lg:col-start-10 lg:col-span-3 lg:row-start-1 min-h-[150px] sm:min-h-[155px] lg:min-h-[158px]"
              : "lg:col-start-10 lg:col-span-3 lg:row-span-2 min-h-[200px] sm:min-h-[240px] lg:min-h-[320px]"
          }
        >
          {third && <ArticleCard post={third} variant="hero" size="small" />}
        </div>
        {hasFourth && (
          <div className="lg:col-start-10 lg:col-span-3 lg:row-start-2 min-h-[150px] sm:min-h-[155px] lg:min-h-[158px]">
            <ArticleCard post={fourth} variant="hero" size="small" />
          </div>
        )}
      </div>
    </section>
  );
}
