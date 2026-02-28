import Link from "next/link";
import Image from "next/image";
import type { PostWithMeta } from "@/lib/api";

interface OfferteSidebarProps {
  posts: PostWithMeta[];
}

export default function OfferteSidebar({ posts }: OfferteSidebarProps) {
  if (posts.length === 0) return null;

  return (
    <aside className="bg-sidebar-bg rounded-lg p-6 w-full lg:w-[320px] shrink-0">
      <h2 className="text-white font-bold text-lg mb-4">Offerte</h2>
      <div className="space-y-3">
        {posts.slice(0, 5).map((post) => (
          <Link
            key={post.id}
            href={`/${post.slug}`}
            className="block group overflow-hidden rounded-lg aspect-video relative bg-content-bg"
          >
            {post.imageUrl && (
              <Image
                src={post.imageUrl}
                alt={post.imageAlt}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="320px"
              />
            )}
            <span className="absolute bottom-2 left-2 text-accent text-xs font-semibold uppercase">
              {post.categoryName}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
