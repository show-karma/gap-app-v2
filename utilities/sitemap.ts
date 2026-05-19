import type { MetadataRoute } from "next";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

export const SITEMAP_PAGE_SIZE = 5000;

type SitemapKind = "projects" | "impacts" | "grants" | "milestones" | "funding-programs";

export interface SitemapCounts {
  projects: number;
  impacts: number;
  grants: number;
  milestones: number;
  fundingPrograms: number;
}

export interface SitemapUrlsResponse {
  urls: string[];
  page: number;
  pageSize: number;
  total: number;
  kind: SitemapKind;
}

const BASE_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

export async function fetchSitemapCounts(): Promise<SitemapCounts | null> {
  try {
    const res = await fetch(`${BASE_URL}${INDEXER.SITEMAP.COUNTS}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(`[sitemap] counts fetch failed: ${res.status}`);
      return null;
    }
    return res.json() as Promise<SitemapCounts>;
  } catch (err) {
    console.error("[sitemap] counts fetch error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function fetchSitemapUrls(
  kind: SitemapKind,
  page: number,
  pageSize: number = SITEMAP_PAGE_SIZE
): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}${INDEXER.SITEMAP.URLS(kind, page, pageSize)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      console.error(`[sitemap] urls fetch failed for kind=${kind} page=${page}: ${res.status}`);
      return [];
    }
    const data = (await res.json()) as SitemapUrlsResponse;
    return data.urls ?? [];
  } catch (err) {
    console.error(
      `[sitemap] urls fetch error for kind=${kind} page=${page}:`,
      err instanceof Error ? err.message : err
    );
    return [];
  }
}

export function buildSitemapEntries(
  urls: string[],
  options: {
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }
): MetadataRoute.Sitemap {
  const lastModified = new Date().toISOString();
  return urls.map((url) => ({
    url,
    lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
  }));
}

export function computeChunkCount(total: number, pageSize: number = SITEMAP_PAGE_SIZE): number {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}
