import { describe, expect, it } from "vitest";
import { getAskKarmaConfig } from "@/src/features/ask-karma/config";

describe("getAskKarmaConfig", () => {
  it("returns the default config when no tenant id is provided", () => {
    const config = getAskKarmaConfig();
    expect(config.heading).toBe("Ask us anything");
    expect(config.exampleQuestions.length).toBeGreaterThan(0);
    expect(config.featuredTopics.length).toBeGreaterThan(0);
    expect(config.assistantTitle).toBe("Karma Assistant");
  });

  it("returns the default config when the tenant id is unknown", () => {
    const config = getAskKarmaConfig("not-a-real-tenant");
    expect(config.heading).toBe("Ask us anything");
  });

  it("returns the default config for null or undefined", () => {
    expect(getAskKarmaConfig(null)).toEqual(getAskKarmaConfig());
    expect(getAskKarmaConfig(undefined)).toEqual(getAskKarmaConfig());
  });

  it("returns the filecoin-specific config when tenant id is 'filecoin'", () => {
    const config = getAskKarmaConfig("filecoin");
    // Filecoin example questions must include the bespoke "fil.one" prompt
    // from the screenshot — this is the contract we wire from the spec.
    expect(config.exampleQuestions.some((q) => q.toLowerCase().includes("fil.one"))).toBe(true);
    expect(config.featuredTopics.some((t) => t.title.includes("ProPGF"))).toBe(true);
  });

  it("returns featured topics that are well-formed", () => {
    const config = getAskKarmaConfig("filecoin");
    for (const topic of config.featuredTopics) {
      expect(topic.title).toBeTruthy();
      expect(topic.icon).toBeTruthy();
      // Every topic should expose at least one navigation surface — links OR a CTA.
      const hasLinks = (topic.links?.length ?? 0) > 0;
      const hasCta = Boolean(topic.cta);
      expect(hasLinks || hasCta).toBe(true);
    }
  });
});
