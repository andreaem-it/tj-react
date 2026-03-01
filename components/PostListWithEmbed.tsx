import { fetchPostsWithEmbed } from "@/lib/api";
import AuthorCard from "./AuthorCard";

export default async function PostListWithEmbed() {
  const posts = await fetchPostsWithEmbed();

  return (
    <>
      {posts.map((post: { id: number; title: { rendered: string }; _embedded?: { author?: unknown[] } }) => {
        const author = post._embedded?.author?.[0];

        return (
          <div key={post.id}>
            <h2 dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
            {author && <AuthorCard author={author} />}
          </div>
        );
      })}
    </>
  );
}
