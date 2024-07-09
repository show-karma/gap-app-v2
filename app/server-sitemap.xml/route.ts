// app/server-sitemap-index.xml/route.ts
import { getServerSideSitemapIndex } from "next-sitemap";

export async function GET(request: Request) {
  return getServerSideSitemapIndex([
    "https://gap.karmahq.xyz/server-sitemaps/projects.xml",
    "https://gap.karmahq.xyz/server-sitemaps/communities.xml",
  ]);
}
