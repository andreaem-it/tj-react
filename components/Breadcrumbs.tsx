import Link from "next/link";

export type BreadcrumbItem = { label: string; href?: string };

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

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
      ...(item.href && { item: `https://www.techjournal.it${item.href}` }),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted mb-4">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-x-2">
              {i > 0 && <span aria-hidden>/</span>}
              {item.href ? (
                <Link href={item.href} className="hover:text-accent transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
