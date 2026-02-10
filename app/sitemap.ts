import type { MetadataRoute } from "next";
import { SITE_URL } from "@/utilities/meta";

export default function sitemap(): MetadataRoute.Sitemap {
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
    "/privacy-policy",
    "/terms-and-conditions",
  ];

  return staticPages.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date().toISOString(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path.startsWith("/knowledge") ? 0.7 : 0.8,
  }));
}
