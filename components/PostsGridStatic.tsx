import type { PostWithMeta } from "@/lib/api";
import ArticleCardStatic from "./ArticleCardStatic";

interface PostsGridStaticProps {
  posts: PostWithMeta[];
  emptyGridIsExpected?: boolean;
}

export default function PostsGridStatic({ posts, emptyGridIsExpected }: PostsGridStaticProps) {
  if (posts.length === 0) {
    if (!emptyGridIsExpected) {
      return (
        <p className="text-muted py-8 text-center">Nessun articolo trovato.</p>
      );
    }
    return null;
  }

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {posts.map((post, index) => (
          <ArticleCardStatic key={post.id} post={post} priority={index === 0} />
        ))}
      </div>
    </section>
  );
}
