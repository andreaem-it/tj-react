import Link from "next/link";
import { SITE_URL } from "@/lib/constants";

export type BreadcrumbItem = { label: string; href?: string };

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const BASE = SITE_URL.replace(/\/$/, "");

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: stripHtml(item.label),
      ...(item.href && { item: `${BASE}${item.href.startsWith("/") ? "" : "/"}${item.href}` }),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted mb-4 w-full max-w-full min-w-0">
        <ol className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 w-full max-w-full min-w-0">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-x-2 min-w-0 max-w-full">
              {i > 0 && <span aria-hidden className="shrink-0">
                /
              </span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-accent transition-colors wrap-anywhere text-center min-w-0 max-w-full"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground wrap-anywhere text-center min-w-0 max-w-full">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
