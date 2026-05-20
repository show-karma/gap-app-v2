import {
  substituteAccessDeniedTemplate,
  validateAccessDeniedTemplate,
} from "@/utilities/accessDeniedTemplate";

const baseVars = {
  communityName: "Octant",
  communitySlug: "octant",
  appUrl: "https://app.example",
  requiredRoles: "Admin",
  currentRoles: "Reviewer",
};

describe("substituteAccessDeniedTemplate", () => {
  it("substitutes all known tokens", () => {
    expect(
      substituteAccessDeniedTemplate(
        "Welcome to {{communityName}} ({{communitySlug}}). Visit {{appUrl}}. Need {{requiredRoles}}; have {{currentRoles}}.",
        baseVars
      )
    ).toBe("Welcome to Octant (octant). Visit https://app.example. Need Admin; have Reviewer.");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(substituteAccessDeniedTemplate("hi {{ communityName }}", baseVars)).toBe("hi Octant");
  });

  it("leaves currentRoles literal when null (unauthenticated scenario)", () => {
    expect(
      substituteAccessDeniedTemplate("Need {{requiredRoles}}; have {{currentRoles}}.", {
        ...baseVars,
        currentRoles: null,
      })
    ).toBe("Need Admin; have {{currentRoles}}.");
  });

  it("leaves unknown tokens literal", () => {
    expect(substituteAccessDeniedTemplate("Hi {{nope}}!", baseVars)).toBe("Hi {{nope}}!");
  });

  it("returns the source unchanged when there are no tokens", () => {
    expect(substituteAccessDeniedTemplate("plain text", baseVars)).toBe("plain text");
  });

  it("does NOT recursively substitute substituted values", () => {
    // If communityName itself contained {{appUrl}}, the second-pass
    // substitution would let an admin inject tokens through their
    // display name. The single-pass replace prevents this.
    expect(
      substituteAccessDeniedTemplate("name={{communityName}}", {
        ...baseVars,
        communityName: "{{appUrl}}",
      })
    ).toBe("name={{appUrl}}");
  });
});

describe("validateAccessDeniedTemplate", () => {
  it("returns empty result for null/undefined/empty", () => {
    expect(validateAccessDeniedTemplate(null, "unauthenticated")).toEqual({
      unknownTokens: [],
      disallowedTokens: [],
    });
    expect(validateAccessDeniedTemplate(undefined, "forbidden")).toEqual({
      unknownTokens: [],
      disallowedTokens: [],
    });
    expect(validateAccessDeniedTemplate("", "unauthenticated")).toEqual({
      unknownTokens: [],
      disallowedTokens: [],
    });
  });

  it("accepts the full vocabulary in forbidden scenario", () => {
    expect(
      validateAccessDeniedTemplate(
        "{{communityName}} {{communitySlug}} {{appUrl}} {{requiredRoles}} {{currentRoles}}",
        "forbidden"
      )
    ).toEqual({ unknownTokens: [], disallowedTokens: [] });
  });

  it("flags currentRoles as disallowed in unauthenticated scenario", () => {
    const result = validateAccessDeniedTemplate(
      "Need {{requiredRoles}}; have {{currentRoles}}.",
      "unauthenticated"
    );
    expect(result.unknownTokens).toEqual([]);
    expect(result.disallowedTokens).toEqual(["currentRoles"]);
  });

  it("flags unknown tokens regardless of scenario", () => {
    const result = validateAccessDeniedTemplate("hello {{nope}} {{alsoNope}}", "forbidden");
    expect(result.unknownTokens.sort()).toEqual(["alsoNope", "nope"]);
    expect(result.disallowedTokens).toEqual([]);
  });

  it("deduplicates repeated tokens", () => {
    const result = validateAccessDeniedTemplate(
      "{{nope}} again {{nope}} and {{currentRoles}} {{currentRoles}}",
      "unauthenticated"
    );
    expect(result.unknownTokens).toEqual(["nope"]);
    expect(result.disallowedTokens).toEqual(["currentRoles"]);
  });
});
