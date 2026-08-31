import type { MetadataRoute } from "next";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { SITE_URL } from "@/utilities/meta";

// Community roots, plus the sub-pages that have earned an entry.
//
// Most sub-pages under /community/<id>/ are still client-rendered shells: a
// crawl of production (2026-08-03, Googlebot UA, JavaScript disabled) measured
// updates 475, impact 613, financials 501 and reports 406 chars of visible
// text, while /projects rendered 5578 chars that are 99.9% identical to the
// community root's 5570 with no unique words at all.
//
// Submitting those would ask Google to index thin pages plus a literal
// duplicate of a URL already in this sitemap, so they stay out and consolidate
// onto the community root via the layout canonical they inherit. They still
// serve 200 — they are de-listed, not removed.
//
// A sub-page earns an entry here once it server-renders content a crawler can
// read AND declares its own canonical. `funding-opportunities` cleared that bar
// in DEV-611: the program directory (title, status, deadline, funding facts)
// is prefetched server-side into the initial HTML and the route declares a
// whitelabel-aware self-canonical. `communitySubpageCanonicals` in
// __tests__/app/community-subpage-canonicals.test.ts fails if an entry is
// added without both halves, so this cannot be undone by accident.
const SELF_CANONICAL_SUBPAGES = ["funding-opportunities"] as const;

// `lastModified` is intentionally omitted — we have no accurate per-page
// modified date, and a fabricated "now" makes Google distrust the signal
// (see utilities/sitemap.ts buildUrlsetXml).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return chosenCommunities().flatMap((community) => {
    const root = `${SITE_URL}/community/${community.slug || community.uid}`;
    return [
      {
        url: root,
        changeFrequency: "daily" as const,
        priority: 0.9,
      },
      ...SELF_CANONICAL_SUBPAGES.map((subPage) => ({
        url: `${root}/${subPage}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ];
  });
}
