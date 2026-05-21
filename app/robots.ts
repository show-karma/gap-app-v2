import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utilities/meta";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/.well-known/"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/.well-known/", "/llms.txt", "/llms-full.txt", "/agents.md"],
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
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemaps/static/sitemap.xml`,
      `${SITE_URL}/sitemaps/communities/sitemap.xml`,
      `${SITE_URL}/sitemaps/projects/sitemap/1.xml`,
      `${SITE_URL}/sitemaps/grants/sitemap/1.xml`,
      `${SITE_URL}/sitemaps/impacts/sitemap/1.xml`,
      `${SITE_URL}/sitemaps/milestones/sitemap/1.xml`,
      `${SITE_URL}/sitemaps/funding-programs/sitemap/1.xml`,
    ],
    host: SITE_URL,
  };
}
