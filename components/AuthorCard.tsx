export type Author = {
  name: string;
  description?: string;
  avatar_urls: Record<string, string | undefined>;
};

function isValidAuthor(a: unknown): a is Author {
  return (
    a != null &&
    typeof a === "object" &&
    "name" in a &&
    typeof (a as Author).name === "string" &&
    "avatar_urls" in a &&
    typeof (a as Author).avatar_urls === "object" &&
    (a as Author).avatar_urls != null
  );
}

function getAvatarUrl(urls: Author["avatar_urls"]): string | null {
  if (!urls) return null;
  return urls["96"] ?? urls[96] ?? urls["48"] ?? urls[48] ?? urls["24"] ?? urls[24] ?? null;
}

export default function AuthorCard({ author }: { author: unknown }) {
  if (!isValidAuthor(author)) return null;

  const avatarUrl = getAvatarUrl(author.avatar_urls);

  return (
    <div className="flex items-start gap-4">
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={author.name}
          width={96}
          height={96}
          className="rounded-full object-cover shrink-0 w-12 h-12 md:w-[96px] md:h-[96px]"
        />
      )}
      <div className="min-w-0">
        <p className="text-muted text-sm font-semibold uppercase tracking-wide mb-1">Scritto da</p>
        <h4 className="text-foreground font-medium">{author.name}</h4>
        {author.description && (
          <div
            className="text-muted text-sm mt-2 leading-relaxed [&_p]:mb-2 last:[&_p]:mb-0"
            dangerouslySetInnerHTML={{ __html: author.description }}
          />
        )}
      </div>
    </div>
  );
}
