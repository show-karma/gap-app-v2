import { NextResponse } from "next/server";
import { APP_ROUTE_TEMPLATES } from "@/utilities/appRouteTemplates";
import { SITE_URL } from "@/utilities/meta";
import { formatSitemapLastmod } from "@/utilities/sitemap";

/**
 * Extended sitemap — route TEMPLATES (with `:param` placeholders) for the Karma
 * agent backend to FETCH instead of hardcoding a copy of the routes.
 *
 * Separate from the public SEO sitemap (`/sitemap.xml`) and its index — those
 * are untouched. This file is disallowed for crawlers in `app/robots.ts`;
 * robots.txt only governs crawlers, so the backend can still fetch this URL
 * over HTTP. Served as a plain route handler (not a Next metadata sitemap) so
 * the `:param` placeholders and exact XML are emitted verbatim.
 */
function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(): Promise<NextResponse> {
  const lastmod = formatSitemapLastmod();

  const urls = APP_ROUTE_TEMPLATES.map(
    (path) =>
      `  <url>\n    <loc>${escapeXml(
        `${SITE_URL}${path}`
      )}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
  ).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
