import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utilities/meta";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /api/llms.txt is explicitly allowed even though /api/ is
        // otherwise blocked — it's the only /api/* file we want AEO
        // crawlers to ingest. Most crawlers honour longest-match
        // precedence (allow more specific than disallow).
        allow: ["/", "/.well-known/", "/api/llms.txt"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md", "/api/llms.txt"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md", "/api/llms.txt"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md", "/api/llms.txt"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md", "/api/llms.txt"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md", "/api/llms.txt"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      // Training-only crawlers: no answer-engine value, full disallow.
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
      {
        userAgent: "Bytespider",
        disallow: ["/"],
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`],
    host: SITE_URL,
  };
}
