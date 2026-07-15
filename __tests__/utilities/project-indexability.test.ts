import { describe, expect, it } from "vitest";
import {
  buildProjectIndexabilityEndpoint,
  classifyProjectQuery,
  normalizeLegacyProjectPath,
  parseProjectIndexabilityRequest,
} from "@/utilities/project-indexability";

/**
 * RED (Edge-safe project-indexability utility, ADR 0001, D2/D6). Pins the pure
 * functions the middleware/metadata layer will consume: legacy path
 * normalization, request parsing into the strict indexer query vocabulary,
 * query-param classification, and endpoint building. Framework-free so it runs
 * on the Edge runtime.
 */

interface ParsedQuery {
  route: string;
  grantUid?: string;
}

interface ParsedRequest {
  identifier: string;
  query: ParsedQuery;
  normalizedPath: string;
}

describe("normalizeLegacyProjectPath", () => {
  it.each([
    ["/project/paraswap/grants", "/project/paraswap/funding"],
    ["/project/paraswap/grants/0xgrant", "/project/paraswap/funding/0xgrant"],
    ["/project/paraswap/funding/create-grant", "/project/paraswap/funding/new"],
    // A project literally named "grants" must not be corrupted: the identifier
    // segment is left alone; only the tab segment is rewritten.
    ["/project/grants", "/project/grants"],
    ["/project/grants/grants", "/project/grants/funding"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeLegacyProjectPath(input)).toBe(expected);
  });
});

describe("parseProjectIndexabilityRequest", () => {
  const cases: Array<{ pathname: string; expected: ParsedRequest }> = [
    {
      pathname: "/project/paraswap",
      expected: {
        identifier: "paraswap",
        query: { route: "root" },
        normalizedPath: "/project/paraswap",
      },
    },
    {
      pathname: "/project/paraswap/about",
      expected: {
        identifier: "paraswap",
        query: { route: "about" },
        normalizedPath: "/project/paraswap/about",
      },
    },
    {
      pathname: "/project/paraswap/roadmap",
      expected: {
        identifier: "paraswap",
        query: { route: "roadmap" },
        normalizedPath: "/project/paraswap/roadmap",
      },
    },
    {
      pathname: "/project/paraswap/team",
      expected: {
        identifier: "paraswap",
        query: { route: "team" },
        normalizedPath: "/project/paraswap/team",
      },
    },
    {
      pathname: "/project/paraswap/updates",
      expected: {
        identifier: "paraswap",
        query: { route: "updates" },
        normalizedPath: "/project/paraswap/updates",
      },
    },
    {
      pathname: "/project/paraswap/funding",
      expected: {
        identifier: "paraswap",
        query: { route: "funding" },
        normalizedPath: "/project/paraswap/funding",
      },
    },
    {
      pathname: "/project/paraswap/impact",
      expected: {
        identifier: "paraswap",
        query: { route: "impact" },
        normalizedPath: "/project/paraswap/impact",
      },
    },
    {
      pathname: "/project/paraswap/contact-info",
      expected: {
        identifier: "paraswap",
        query: { route: "contact-info" },
        normalizedPath: "/project/paraswap/contact-info",
      },
    },
    {
      pathname: "/project/paraswap/funding/new",
      expected: {
        identifier: "paraswap",
        query: { route: "grant-new" },
        normalizedPath: "/project/paraswap/funding/new",
      },
    },
    {
      pathname: "/project/paraswap/funding/0xgrant",
      expected: {
        identifier: "paraswap",
        query: { route: "grant-detail", grantUid: "0xgrant" },
        normalizedPath: "/project/paraswap/funding/0xgrant",
      },
    },
    {
      pathname: "/project/paraswap/funding/0xgrant/edit",
      expected: {
        identifier: "paraswap",
        query: { route: "grant-edit", grantUid: "0xgrant" },
        normalizedPath: "/project/paraswap/funding/0xgrant/edit",
      },
    },
    {
      pathname: "/project/paraswap/funding/0xgrant/complete-grant",
      expected: {
        identifier: "paraswap",
        query: { route: "grant-complete", grantUid: "0xgrant" },
        normalizedPath: "/project/paraswap/funding/0xgrant/complete-grant",
      },
    },
    {
      pathname: "/project/paraswap/funding/0xgrant/milestones-and-updates",
      expected: {
        identifier: "paraswap",
        query: { route: "grant-milestones-and-updates", grantUid: "0xgrant" },
        normalizedPath: "/project/paraswap/funding/0xgrant/milestones-and-updates",
      },
    },
    {
      pathname: "/project/paraswap/funding/0xgrant/impact-criteria",
      expected: {
        identifier: "paraswap",
        query: { route: "grant-impact-criteria", grantUid: "0xgrant" },
        normalizedPath: "/project/paraswap/funding/0xgrant/impact-criteria",
      },
    },
    // Legacy paths are normalized directly by parse (grants -> funding,
    // funding/create-grant -> funding/new) and classified accordingly.
    {
      pathname: "/project/paraswap/grants/0xgrant",
      expected: {
        identifier: "paraswap",
        query: { route: "grant-detail", grantUid: "0xgrant" },
        normalizedPath: "/project/paraswap/funding/0xgrant",
      },
    },
    {
      pathname: "/project/paraswap/funding/create-grant",
      expected: {
        identifier: "paraswap",
        query: { route: "grant-new" },
        normalizedPath: "/project/paraswap/funding/new",
      },
    },
    // Trailing slashes are stripped in normalizedPath.
    {
      pathname: "/project/paraswap/",
      expected: {
        identifier: "paraswap",
        query: { route: "root" },
        normalizedPath: "/project/paraswap",
      },
    },
    {
      pathname: "/project/paraswap/team/",
      expected: {
        identifier: "paraswap",
        query: { route: "team" },
        normalizedPath: "/project/paraswap/team",
      },
    },
  ];

  it.each(cases)("parses $pathname", ({ pathname, expected }) => {
    expect(parseProjectIndexabilityRequest(pathname)).toEqual(expected);
  });

  it.each([
    "/project/paraswap/unknown-tab",
    "/project/paraswap/funding/0xgrant/unknown-subpage",
    "/project/paraswap/funding//edit",
    "/communities/gitcoin",
    "/project",
    "/",
  ])("returns null for the non-project path %s", (pathname) => {
    expect(parseProjectIndexabilityRequest(pathname)).toBeNull();
  });
});

describe("classifyProjectQuery", () => {
  it("returns clean when there are no query params", () => {
    expect(classifyProjectQuery(new URLSearchParams(""))).toBe("clean");
  });

  it("returns tracking-only when every param is a known tracking param", () => {
    const params = new URLSearchParams(
      "utm_source=a&utm_medium=b&utm_campaign=c&gclid=d&fbclid=e&msclkid=f&dclid=g"
    );
    expect(classifyProjectQuery(params)).toBe("tracking-only");
  });

  it("returns stateful when a non-tracking param exists", () => {
    expect(classifyProjectQuery(new URLSearchParams("programId=531"))).toBe("stateful");
  });

  it("returns stateful when tracking params are mixed with a stateful param", () => {
    expect(classifyProjectQuery(new URLSearchParams("utm_source=a&programId=1"))).toBe("stateful");
  });
});

describe("buildProjectIndexabilityEndpoint", () => {
  it("builds a root endpoint", () => {
    const parsed: ParsedRequest = {
      identifier: "paraswap",
      query: { route: "root" },
      normalizedPath: "/project/paraswap",
    };

    expect(buildProjectIndexabilityEndpoint("https://api.example.com", parsed)).toBe(
      "https://api.example.com/v2/projects/paraswap/indexability?route=root"
    );
  });

  it("builds a grant endpoint carrying grantUid", () => {
    const parsed: ParsedRequest = {
      identifier: "paraswap",
      query: { route: "grant-detail", grantUid: "0xgrant" },
      normalizedPath: "/project/paraswap/funding/0xgrant",
    };

    expect(buildProjectIndexabilityEndpoint("https://api.example.com", parsed)).toBe(
      "https://api.example.com/v2/projects/paraswap/indexability?route=grant-detail&grantUid=0xgrant"
    );
  });

  it("percent-encodes the identifier segment", () => {
    const parsed: ParsedRequest = {
      identifier: "weird slug",
      query: { route: "root" },
      normalizedPath: "/project/weird slug",
    };

    expect(buildProjectIndexabilityEndpoint("https://api.example.com", parsed)).toBe(
      "https://api.example.com/v2/projects/weird%20slug/indexability?route=root"
    );
  });

  it("does not double the slash when the base URL has a trailing slash", () => {
    const parsed: ParsedRequest = {
      identifier: "paraswap",
      query: { route: "root" },
      normalizedPath: "/project/paraswap",
    };

    expect(buildProjectIndexabilityEndpoint("https://api.example.com/", parsed)).toBe(
      "https://api.example.com/v2/projects/paraswap/indexability?route=root"
    );
  });
});
