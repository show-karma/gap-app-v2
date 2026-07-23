import * as Sentry from "@sentry/nextjs";
import type { MetadataRoute } from "next";
import { getPublishedSlugs } from "@/sanity/lib/gateway";
import { SITE_URL } from "@/utilities/meta";
import { PAGES } from "@/utilities/pages";

const staticPages = [
  "",
  "/projects",
  "/communities",
  "/funders",
  "/funding-map",
  "/seeds",
  "/create-project-profile",
  "/knowledge",
  "/knowledge/grant-accountability",
  "/knowledge/why-grant-programs-fail",
  "/knowledge/dao-grant-milestones",
  "/knowledge/onchain-reputation",
  "/knowledge/project-reputation",
  "/knowledge/milestones-vs-impact",
  "/knowledge/impact-verification",
  "/knowledge/manual-vs-platform-grant-tracking",
  "/knowledge/reputation-compounding",
  "/knowledge/grant-lifecycle",
  "/knowledge/ai-grant-evaluation",
  "/knowledge/project-registry",
  "/knowledge/grant-kyc",
  "/knowledge/grant-document-signing",
  "/knowledge/grant-fund-disbursement",
  "/knowledge/impact-measurement",
  "/knowledge/whitelabel-funding-platforms",
  "/knowledge/funding-distribution-mechanisms",
  "/knowledge/project-profiles",
  "/knowledge/why-grantees-need-project-profiles",
  "/knowledge/project-profiles-as-resumes",
  "/knowledge/project-updates-and-reputation",
  "/knowledge/project-profiles-software-vs-nonsoftware",
  "/knowledge/onchain-project-profiles",
  "/knowledge/how-funders-use-project-profiles",
  "/mcp/connect",
  PAGES.BLOG,
  "/foundations",
  "/donor-advisors",
  "/nonprofits",
  "/nonprofits/find-funders",
  "/nonprofits/find-funders/connect",
  "/nonprofits/find-funders/connect/claude",
  "/nonprofits/find-funders/connect/chatgpt",
  "/for-agents",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-and-conditions",
];

const lowPriorityPages = ["/privacy-policy", "/terms-and-conditions"];

// `lastModified` is intentionally omitted for the static pages below — we
// have no accurate per-page modified date, and a fabricated "now" makes
// Google distrust the signal (see utilities/sitemap.ts buildUrlsetXml).
// Blog posts are the one legitimate exception: `publishedAt` from Sanity is
// a real, accurate modified date, so those entries do carry `lastModified`.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "" ? "daily" : lowPriorityPages.includes(path) ? "yearly" : "weekly",
    priority:
      path === ""
        ? 1
        : lowPriorityPages.includes(path)
          ? 0.3
          : path.startsWith("/knowledge")
            ? 0.7
            : 0.8,
  }));

  // Draft posts never appear here — the gateway's slug query only returns
  // published posts, and the gateway itself never throws (CMS errors
  // resolve to `[]`). The try/catch below is a second line of defense: even
  // if that contract ever changes, the sitemap route must still resolve to
  // the static pages rather than 500 the whole file.
  let publishedSlugs: Awaited<ReturnType<typeof getPublishedSlugs>> = [];
  try {
    publishedSlugs = await getPublishedSlugs();
  } catch (error) {
    Sentry.captureException(error, { tags: { module: "blog-sitemap" } });
  }

  const postEntries: MetadataRoute.Sitemap = publishedSlugs.map(({ slug, publishedAt }) => ({
    url: `${SITE_URL}${PAGES.BLOG_POST(slug)}`,
    lastModified: publishedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticEntries, ...postEntries];
}
