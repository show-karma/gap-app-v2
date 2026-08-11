import { describe, expect, it } from "vitest";

import * as scriptDomains from "@/scripts/indexability/domains.mjs";
import { CANONICAL_ORIGIN, ROOT_DOMAIN } from "@/utilities/domains";

// The indexability scripts run as plain `node scripts/verify-indexability.mjs`
// on Node 20 (see .github/workflows/indexability-monitor.yml), so they cannot
// import utilities/domains.ts. This guard fails if the two copies drift.
describe("scripts/indexability/domains.mjs parity with utilities/domains.ts", () => {
  it("mirrors the canonical origin", () => {
    expect(scriptDomains.CANONICAL_ORIGIN).toBe(CANONICAL_ORIGIN);
  });

  it("derives apex and gap origins from the same root domain", () => {
    expect(scriptDomains.APEX_ORIGIN).toBe(`https://${ROOT_DOMAIN}`);
    expect(scriptDomains.GAP_ORIGIN).toBe(`https://gap.${ROOT_DOMAIN}`);
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
