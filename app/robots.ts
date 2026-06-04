import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utilities/meta";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/.well-known/"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/", "/extended-sitemap.xml"],
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
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-index.xml`],
    host: SITE_URL,
  };
}
