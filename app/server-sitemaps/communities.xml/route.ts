import { ISitemapField, getServerSideSitemap } from "next-sitemap";
import { chosenCommunities } from "@/utilities/chosenCommunities";

export async function GET(request: Request) {
  const paths: ISitemapField[] = chosenCommunities().map((community) => ({
    loc: `https://gap.karmahq.xyz/${community.slug || community.uid}`,
    lastmod: new Date().toISOString(),
    changefreq: "daily",
    priority: 0.7,
  }));

  return getServerSideSitemap(paths);
}
