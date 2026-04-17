import Link from "next/link";
import { SITE_URL } from "@/lib/constants";

export const metadata = {
  title: "API Documentation",
  description: "Technical references for TechJournal API and agent endpoints.",
};

export default function DocsPage() {
  const base = SITE_URL.replace(/\/$/, "");

  const endpoints = [
    { href: "/api/openapi.json", label: "OpenAPI Specification" },
    { href: "/api/status", label: "API Status" },
    { href: "/.well-known/api-catalog", label: "API Catalog" },
    { href: "/.well-known/mcp.json", label: "MCP Discovery" },
    { href: "/.well-known/agent.json", label: "A2A Agent Card" },
    { href: "/agents.json", label: "Agents Index" },
    { href: "/.well-known/webmcp.json", label: "WebMCP Manifest" },
  ];

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-foreground text-3xl font-bold mb-4">TechJournal API Docs</h1>
      <p className="text-muted mb-6">
        Documentation and machine-readable descriptors for API and AI agent integrations.
      </p>
      <ul className="space-y-3">
        {endpoints.map((endpoint) => (
          <li key={endpoint.href}>
            <Link className="text-accent hover:underline break-all" href={endpoint.href}>
              {base}
              {endpoint.href}
            </Link>
            <p className="text-sm text-muted">{endpoint.label}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
