import { describe, expect, it } from "vitest";
import { getAskKarmaConfig, selectAskKarmaQuestions } from "@/src/features/ask-karma/config";
import type { AskKarmaConfig } from "@/src/features/ask-karma/types";

describe("getAskKarmaConfig", () => {
  it("returns the default config when no tenant id is provided", () => {
    const config = getAskKarmaConfig();
    expect(config.heading).toBe("Ask Karma");
    expect(config.exampleQuestions.length).toBeGreaterThan(0);
    expect(config.featuredTopics.length).toBeGreaterThan(0);
    expect(config.assistantTitle).toBe("Karma Assistant");
  });

  it("returns the default config when the tenant id is unknown", () => {
    const config = getAskKarmaConfig("not-a-real-tenant");
    expect(config.heading).toBe("Ask Karma");
  });

  it("returns the default config for null or undefined", () => {
    expect(getAskKarmaConfig(null)).toEqual(getAskKarmaConfig());
    expect(getAskKarmaConfig(undefined)).toEqual(getAskKarmaConfig());
  });

  it("returns the filecoin-specific config when tenant id is 'filecoin'", () => {
    const config = getAskKarmaConfig("filecoin");
    // Filecoin overrides the default question list and surfaces a ProPGF
    // card — keep these as the durable contract rather than pinning to
    // specific copy that the customer iterates on.
    expect(config.exampleQuestions).not.toEqual(getAskKarmaConfig().exampleQuestions);
    expect(config.featuredTopics.some((t) => t.title.includes("ProPGF"))).toBe(true);
  });

  it("returns the default config for a known tenant that has no override", () => {
    // optimism is a known tenant id but isn't in TENANT_CONFIGS — should
    // fall through to DEFAULT_CONFIG, not throw or return undefined.
    const config = getAskKarmaConfig("optimism");
    expect(config.heading).toBe("Ask Karma");
    expect(config.assistantTitle).toBe("Karma Assistant");
  });

  it("returns the default config for an arbitrary community slug (not a known tenant)", () => {
    // An unrecognized community slug must NOT match a tenant config by
    // coincidence — the isKnownTenant guard is what enforces this.
    const config = getAskKarmaConfig("some-random-community-uid-or-slug");
    expect(config).toEqual(getAskKarmaConfig());
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

  it("defines persona-specific prompts for the default and filecoin tenants", () => {
    for (const key of [undefined, "filecoin"]) {
      const byPersona = getAskKarmaConfig(key).exampleQuestionsByPersona;
      expect(byPersona?.visitor?.length).toBeGreaterThan(0);
      expect(byPersona?.reviewer?.length).toBeGreaterThan(0);
      expect(byPersona?.grantee?.length).toBeGreaterThan(0);
    }
  });

  it("surfaces the filecoin-specific reviewer prompts (ProPGF / Batch 3)", () => {
    const filecoin = getAskKarmaConfig("filecoin").exampleQuestionsByPersona;
    expect(filecoin?.visitor).toContain("What is ProPGF?");
    expect(filecoin?.reviewer?.some((q) => q.includes("Batch 3"))).toBe(true);
    // Filecoin's customer-specific copy must not leak into the generic tenant.
    const generic = getAskKarmaConfig().exampleQuestionsByPersona;
    expect(generic?.visitor?.some((q) => q.includes("ProPGF"))).toBe(false);
    expect(generic?.reviewer?.some((q) => q.includes("Batch 3"))).toBe(false);
  });
});

describe("selectAskKarmaQuestions", () => {
  const withPersonas: AskKarmaConfig = {
    ...getAskKarmaConfig(),
    exampleQuestions: ["fallback-a", "fallback-b"],
    exampleQuestionsByPersona: {
      visitor: ["v1", "v2"],
      reviewer: ["r1", "r2", "r3", "r4"],
      grantee: ["g1", "g2", "g3", "g4", "g5"],
    },
  };

  it("returns the flat list when a tenant defines no persona prompts", () => {
    const flat: AskKarmaConfig = {
      ...getAskKarmaConfig(),
      exampleQuestions: ["only-a", "only-b"],
      exampleQuestionsByPersona: undefined,
    };
    expect(selectAskKarmaQuestions(flat, "visitor")).toEqual(["only-a", "only-b"]);
    expect(selectAskKarmaQuestions(flat, "reviewer")).toEqual(["only-a", "only-b"]);
    expect(selectAskKarmaQuestions(flat, "grantee")).toEqual(["only-a", "only-b"]);
  });

  it("returns the visitor and grantee sets verbatim", () => {
    expect(selectAskKarmaQuestions(withPersonas, "visitor")).toEqual(["v1", "v2"]);
    expect(selectAskKarmaQuestions(withPersonas, "grantee")).toEqual([
      "g1",
      "g2",
      "g3",
      "g4",
      "g5",
    ]);
  });

  it("blends reviewer prompts first, then tops up with grantee prompts, capped at 6", () => {
    const result = selectAskKarmaQuestions(withPersonas, "reviewer");
    expect(result).toEqual(["r1", "r2", "r3", "r4", "g1", "g2"]);
    expect(result.length).toBeLessThanOrEqual(6);
  });

  it("does not duplicate a prompt shared between reviewer and grantee sets", () => {
    const overlap: AskKarmaConfig = {
      ...withPersonas,
      exampleQuestionsByPersona: {
        reviewer: ["shared", "r2"],
        grantee: ["shared", "g2"],
      },
    };
    const result = selectAskKarmaQuestions(overlap, "reviewer");
    expect(result).toEqual(["shared", "r2", "g2"]);
  });

  it("falls back per-persona when a persona list is missing", () => {
    const partial: AskKarmaConfig = {
      ...getAskKarmaConfig(),
      exampleQuestions: ["fallback"],
      exampleQuestionsByPersona: { grantee: ["g1"] },
    };
    expect(selectAskKarmaQuestions(partial, "visitor")).toEqual(["fallback"]);
    // No reviewer set → fall back to grantee, then to the flat list.
    expect(selectAskKarmaQuestions(partial, "reviewer")).toEqual(["g1"]);
  });
});
