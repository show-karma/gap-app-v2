import axios from "axios";
import type { MetadataRoute } from "next";

export async function generateSitemaps() {
  return [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  let final: MetadataRoute.Sitemap = [];

  try {
    const response = await axios.get(`https://gapapi.karmahq.xyz/projects/sitemap`, {
      timeout: 10000,
    });
    const sitemaps = response.data;

    const sitemapConfig: Record<
      number,
      { key: string; priority: number; changeFrequency: "daily" | "weekly" }
    > = {
      1: { key: "projects", priority: 0.8, changeFrequency: "daily" },
      2: { key: "impacts", priority: 0.7, changeFrequency: "weekly" },
      3: { key: "grants", priority: 0.6, changeFrequency: "weekly" },
      4: { key: "milestonesAndUpdates", priority: 0.5, changeFrequency: "weekly" },
    };

    const config = sitemapConfig[id];
    let sitemap: MetadataRoute.Sitemap = [];

    if (config && sitemaps[config.key]) {
      sitemap = sitemaps[config.key].map((url: string) => ({
        url,
        lastModified: new Date().toISOString(),
        changeFrequency: config.changeFrequency,
        priority: config.priority,
      }));
    }

    final.push(...sitemap);
  } catch (error) {
    console.warn(
      `Failed to fetch sitemap data for ID ${id}:`,
      error instanceof Error ? error.message : error
    );
    console.warn("Returning empty sitemap as fallback");
    final = [];
  }

  return final;
}
