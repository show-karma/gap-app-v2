import {
  buildOverviewParagraph,
  DEFAULT_DESCRIPTION,
  HOME_SUMMARY,
  SITEMAP_DESCRIPTION_MAP,
} from "../../../scripts/generate-llms-txt";

// llms.txt is the file written for answer engines, so its self-description has
// to name the audiences Karma actually serves. It previously described only
// builders and ecosystems, which is why no foundation, donor advisor or
// nonprofit wording appeared anywhere in the published file.
// Kept out of generate-llms-txt.test.ts, which is already at its size limit.

const AUDIENCES = ["Foundations", "Donor advisors", "Nonprofits"];

describe("llms.txt audience coverage", () => {
  it("names all three target audiences in the default description", () => {
    for (const audience of AUDIENCES) {
      expect(DEFAULT_DESCRIPTION).toContain(audience);
    }
  });

  it("names all three target audiences in the home summary", () => {
    const summary = HOME_SUMMARY.toLowerCase();
    for (const audience of AUDIENCES) {
      expect(summary).toContain(audience.toLowerCase());
    }
  });

  it("uses the home summary as the sitemap description for /", () => {
    expect(SITEMAP_DESCRIPTION_MAP["/"]).toBe(HOME_SUMMARY);
  });

  it("carries the audiences through into the overview paragraph", () => {
    const paragraph = buildOverviewParagraph("Optimism, Celo");
    for (const audience of AUDIENCES) {
      expect(paragraph).toContain(audience);
    }
  });

  it("keeps the onchain lane, with networks injected rather than hardcoded", () => {
    const paragraph = buildOverviewParagraph("Optimism, Celo");
    expect(paragraph).toContain("onchain funding programs");
    expect(paragraph).toContain("Optimism, Celo");
    // The chain list must come from SUPPORTED_NETWORKS, never a frozen literal.
    expect(DEFAULT_DESCRIPTION).not.toContain("Optimism");
  });

  it("no longer describes Karma as a builder/ecosystem platform", () => {
    expect(DEFAULT_DESCRIPTION).not.toMatch(/platform for builders/i);
    expect(HOME_SUMMARY).not.toMatch(/ecosystems use karma/i);
  });
});
