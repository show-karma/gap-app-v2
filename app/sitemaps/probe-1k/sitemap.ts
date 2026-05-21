import type { MetadataRoute } from "next";
import { buildSitemapEntries, fetchSitemapUrls } from "@/utilities/sitemap";

// Probe sitemap: serves first 1000 project URLs to test whether GSC
// fetches succeed at this size (vs. the 5000-URL default that fails).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls = await fetchSitemapUrls("projects", 1, 1000);
  return buildSitemapEntries(urls, { priority: 0.8, changeFrequency: "daily" });
}
