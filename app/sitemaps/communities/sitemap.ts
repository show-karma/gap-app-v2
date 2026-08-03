import type { MetadataRoute } from "next";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { SITE_URL } from "@/utilities/meta";

// Community roots only.
//
// Every sub-page under /community/<id>/ is currently a client-rendered shell:
// a crawl of production (2026-08-03, Googlebot UA, JavaScript disabled) measured
// funding-opportunities 406 chars, updates 475, impact 613, financials 501 and
// reports 406 of visible text, while /projects rendered 5578 chars that are
// 99.9% identical to the community root's 5570 with no unique words at all.
//
// Submitting those would ask Google to index five thin pages plus a literal
// duplicate of a URL already in this sitemap, so they stay out and consolidate
// onto the community root via the layout canonical they inherit. They still
// serve 200 — they are de-listed, not removed.
//
// A sub-page earns an entry here once it server-renders content a crawler can
// read AND declares its own canonical. `communitySubpageCanonicals` in
// __tests__/app/community-subpage-canonicals.test.ts fails if one is added
// without both, so this cannot be undone by accident.

// `lastModified` is intentionally omitted — we have no accurate per-page
// modified date, and a fabricated "now" makes Google distrust the signal
// (see utilities/sitemap.ts buildUrlsetXml).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return chosenCommunities().map((community) => ({
    url: `${SITE_URL}/community/${community.slug || community.uid}`,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));
}
