import Image from "next/image";
import Link from "next/link";
import { getCategoryUrlSlugFromWpSlug, type PostWithMeta } from "@/lib/api";
import { BLUR_DATA_URL } from "@/lib/constants";

interface OffertePageProps {
  posts: PostWithMeta[];
}

export default function OffertePage({ posts }: OffertePageProps) {
  return (
    <div className="max-w-4xl mx-auto px-2.5 md:px-4 py-10">
      <header className="mb-10">
        <h1 className="text-foreground text-3xl md:text-4xl font-bold mb-2">Offerte</h1>
        <p className="text-muted text-lg">
          Le migliori offerte selezionate per te, con link diretti per acquistare su Amazon.
        </p>
      </header>

      <div className="grid gap-8 md:gap-10">
        {posts.length === 0 ? (
          <p className="text-muted">Nessuna offerta al momento.</p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="bg-content-bg rounded-xl overflow-hidden border border-border hover:border-accent/30 transition-colors"
            >
              <Link href={`/${getCategoryUrlSlugFromWpSlug(post.categorySlug)}/${post.slug}`} className="block group">
                <div className="flex flex-col md:flex-row">
                  {post.imageUrl && (
                    <div className="relative w-full md:w-72 shrink-0 aspect-video md:aspect-square bg-sidebar-bg">
                      <Image
                        src={post.imageUrl}
                        alt={post.imageAlt}
                        fill
                        className="object-cover transition-transform group-hover:scale-[1.02]"
                        sizes="(max-width: 768px) 100vw, 288px"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                      />
                    </div>
                  )}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                    <h2 className="text-foreground text-xl md:text-2xl font-bold mb-2 group-hover:text-accent transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-muted text-base mb-4 line-clamp-3">{post.excerpt}</p>
                    <span className="inline-flex items-center gap-2 text-accent font-semibold text-sm">
                      Vai all&apos;offerta su Amazon
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
