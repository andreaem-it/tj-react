import { fetchPostsWithEmbed } from "@/lib/api";
import AuthorCard from "./AuthorCard";
import type { PostWithMeta } from "@/lib/api";

export default async function PostListWithEmbed() {
  const posts = await fetchPostsWithEmbed();

  return (
    <>
      {posts.map((post: PostWithMeta) => {
        const author =
          post.authorName
            ? {
                name: post.authorName,
                avatar_urls: post.authorAvatarUrl ? { 96: post.authorAvatarUrl } : {},
              }
            : null;

        return (
          <div key={post.id}>
            <h2>{post.title}</h2>
            {author ? <AuthorCard author={author} /> : null}
          </div>
        );
      })}
    </>
  );
}
