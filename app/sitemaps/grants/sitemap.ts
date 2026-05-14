import type { MetadataRoute } from "next";
import {
  buildSitemapEntries,
  computeChunkCount,
  fetchSitemapCounts,
  fetchSitemapUrls,
  SITEMAP_PAGE_SIZE,
} from "@/utilities/sitemap";

export async function generateSitemaps() {
  const counts = await fetchSitemapCounts();
  const total = counts?.grants ?? 0;
  const chunkCount = computeChunkCount(total, SITEMAP_PAGE_SIZE);
  return Array.from({ length: chunkCount }, (_, i) => ({ id: i + 1 }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const urls = await fetchSitemapUrls("grants", id, SITEMAP_PAGE_SIZE);
  return buildSitemapEntries(urls, { priority: 0.6, changeFrequency: "weekly" });
}
