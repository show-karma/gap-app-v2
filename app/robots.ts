import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utilities/meta";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/admin/", "/super-admin/", "/safe/"],
      },
    ],
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemaps/projects/sitemap.xml`,
      `${SITE_URL}/sitemaps/communities/sitemap.xml`,
    ],
    host: SITE_URL,
  };
}
