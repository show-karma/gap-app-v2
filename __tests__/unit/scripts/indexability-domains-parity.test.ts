import { describe, expect, it } from "vitest";

import * as scriptDomains from "@/scripts/indexability/domains.mjs";
import {
  ALIAS_HOSTS,
  CANONICAL_ORIGIN,
  LEGACY_ROOT_DOMAINS,
  ROOT_DOMAIN,
} from "@/utilities/domains";

// The indexability scripts run as plain `node scripts/verify-indexability.mjs`
// on Node 20 (see .github/workflows/indexability-monitor.yml), so they cannot
// import utilities/domains.ts. This guard fails if the two copies drift.
describe("scripts/indexability/domains.mjs parity with utilities/domains.ts", () => {
  it("mirrors the canonical origin", () => {
    expect(scriptDomains.CANONICAL_ORIGIN).toBe(CANONICAL_ORIGIN);
  });

  it("derives the apex origin from the same root domain", () => {
    expect(scriptDomains.APEX_ORIGIN).toBe(`https://${ROOT_DOMAIN}`);
  });

  // `gap.` belongs to the legacy root only — gap.karmahq.org does not exist, so
  // deriving this from ROOT_DOMAIN would point the crawler at NXDOMAIN.
  it("keeps the gap origin on the legacy root and inside ALIAS_HOSTS", () => {
    expect(scriptDomains.GAP_ORIGIN).toBe(`https://gap.${LEGACY_ROOT_DOMAINS[0]}`);
    expect(ALIAS_HOSTS.has(`gap.${LEGACY_ROOT_DOMAINS[0]}`)).toBe(true);
    expect(ALIAS_HOSTS.has(`gap.${ROOT_DOMAIN}`)).toBe(false);
  });

  it("keeps the sitemap root on the canonical origin", () => {
    expect(scriptDomains.ROOT_SITEMAP_URL).toBe(`${CANONICAL_ORIGIN}/sitemap.xml`);
  });

  // Phase 3/5 hosts: pinned to .xyz on purpose, asserted so a well-meaning
  // find-and-replace across the migration cannot flip them silently.
  it("leaves the indexer origin and contact email on karmahq.xyz", () => {
    expect(scriptDomains.INDEXER_ORIGIN).toBe("https://gapapi.karmahq.xyz");
    expect(scriptDomains.ENGINEERING_EMAIL).toBe("engineering@karmahq.xyz");
  });
});
