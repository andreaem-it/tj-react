import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const base = SITE_URL.replace(/\/$/, "");
  const spec = {
    openapi: "3.1.0",
    info: {
      title: "TechJournal Public API",
      version: "1.0.0",
      description: "Public endpoints for TechJournal integrations and agent access.",
    },
    servers: [{ url: base }],
    paths: {
      "/api/status": {
        get: {
          summary: "Service health status",
          responses: {
            "200": {
              description: "Service status",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { status: { type: "string", example: "ok" } },
                    required: ["status"],
                  },
                },
              },
            },
          },
        },
      },
      "/api/price-radar/products": {
        get: {
          summary: "List monitored products",
          responses: { "200": { description: "Products list" } },
        },
      },
      "/api/price-radar/products/{id}": {
        get: {
          summary: "Get product details",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "Product details" }, "404": { description: "Not found" } },
        },
      },
      "/api/posts": {
        get: {
          summary: "List editorial posts",
          responses: { "200": { description: "Posts list" } },
        },
      },
      "/api/posts/{page}": {
        get: {
          summary: "List editorial posts by page",
          parameters: [
            {
              name: "page",
              in: "path",
              required: true,
              schema: { type: "integer", minimum: 1 },
            },
          ],
          responses: { "200": { description: "Posts list for page" } },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
