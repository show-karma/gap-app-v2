import { describe, expect, it } from "vitest";
import { INDEXER } from "@/utilities/indexer";

/**
 * Guards INDEXER.V2.AUTH.PERMISSIONS — the auth permissions endpoint URL builder.
 * It iterates params via Object.entries, omitting undefined/"" and stringifying
 * the rest. This suite locks that contract so the Object.entries refactor stays
 * correct: included params, omitted blanks, chainId 0 boundary, and the no-param
 * base path.
 */
const buildPermissionsUrl = INDEXER.V2.AUTH.PERMISSIONS;

const BASE = "/v2/auth/permissions";

/** Parses the query string of a built URL into an object for order-independent assertions. */
function queryOf(url: string): Record<string, string> {
  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) return {};
  const params = new URLSearchParams(url.slice(queryIndex + 1));
  return Object.fromEntries(params.entries());
}

describe("INDEXER.V2.AUTH.PERMISSIONS", () => {
  describe("no params (base path)", () => {
    it("returns the bare base path with no query string when called with no args", () => {
      const url = buildPermissionsUrl();

      expect(url).toBe(BASE);
      expect(url).not.toContain("?");
    });

    it("returns the bare base path when given an empty object", () => {
      const url = buildPermissionsUrl({});

      expect(url).toBe(BASE);
      expect(url).not.toContain("?");
    });
  });

  describe("included params (happy path)", () => {
    it("includes communityId when provided", () => {
      const url = buildPermissionsUrl({ communityId: "comm-1" });

      expect(url.startsWith(`${BASE}?`)).toBe(true);
      expect(queryOf(url)).toEqual({ communityId: "comm-1" });
    });

    it("includes programId when provided", () => {
      const url = buildPermissionsUrl({ programId: "prog-7" });

      expect(queryOf(url)).toEqual({ programId: "prog-7" });
    });

    it("includes applicationId when provided", () => {
      const url = buildPermissionsUrl({ applicationId: "app-42" });

      expect(queryOf(url)).toEqual({ applicationId: "app-42" });
    });

    it("includes milestoneId when provided", () => {
      const url = buildPermissionsUrl({ milestoneId: "ms-9" });

      expect(queryOf(url)).toEqual({ milestoneId: "ms-9" });
    });

    it("includes projectId when provided", () => {
      const url = buildPermissionsUrl({ projectId: "proj-3" });

      expect(queryOf(url)).toEqual({ projectId: "proj-3" });
    });

    it("includes every param together when all are provided", () => {
      const url = buildPermissionsUrl({
        communityId: "comm-1",
        programId: "prog-7",
        applicationId: "app-42",
        milestoneId: "ms-9",
        projectId: "proj-3",
        chainId: 10,
      });

      expect(queryOf(url)).toEqual({
        communityId: "comm-1",
        programId: "prog-7",
        applicationId: "app-42",
        milestoneId: "ms-9",
        projectId: "proj-3",
        chainId: "10",
      });
    });
  });

  describe("omitted params (undefined / empty string)", () => {
    it("omits params explicitly set to undefined", () => {
      const url = buildPermissionsUrl({
        communityId: "comm-1",
        programId: undefined,
        projectId: undefined,
      });

      expect(queryOf(url)).toEqual({ communityId: "comm-1" });
      expect(url).not.toContain("programId");
      expect(url).not.toContain("projectId");
    });

    it("omits params set to an empty string", () => {
      const url = buildPermissionsUrl({
        communityId: "comm-1",
        applicationId: "",
        milestoneId: "",
      });

      expect(queryOf(url)).toEqual({ communityId: "comm-1" });
      expect(url).not.toContain("applicationId");
      expect(url).not.toContain("milestoneId");
    });

    it("returns the base path when every provided param is undefined or empty", () => {
      const url = buildPermissionsUrl({
        communityId: undefined,
        programId: "",
        applicationId: undefined,
        milestoneId: "",
        projectId: undefined,
      });

      expect(url).toBe(BASE);
      expect(url).not.toContain("?");
    });
  });

  describe("chainId boundaries", () => {
    it("includes chainId when it is a positive number", () => {
      const url = buildPermissionsUrl({ chainId: 42161 });

      expect(queryOf(url)).toEqual({ chainId: "42161" });
    });

    it("includes chainId 0 — it is defined and must not be dropped as falsy", () => {
      const url = buildPermissionsUrl({ chainId: 0 });

      expect(queryOf(url)).toEqual({ chainId: "0" });
      expect(url).toContain("chainId=0");
    });

    it("omits chainId when it is undefined", () => {
      const url = buildPermissionsUrl({ communityId: "comm-1", chainId: undefined });

      expect(queryOf(url)).toEqual({ communityId: "comm-1" });
      expect(url).not.toContain("chainId");
    });

    it("keeps chainId 0 alongside other params", () => {
      const url = buildPermissionsUrl({ communityId: "comm-1", chainId: 0 });

      expect(queryOf(url)).toEqual({ communityId: "comm-1", chainId: "0" });
    });
  });

  describe("value encoding", () => {
    it("URL-encodes special characters in param values", () => {
      const url = buildPermissionsUrl({ communityId: "a b&c=d" });

      // URLSearchParams encodes space as "+", and escapes & and =.
      expect(url).toContain("communityId=a+b%26c%3Dd");
      // Round-trips back to the original value.
      expect(queryOf(url)).toEqual({ communityId: "a b&c=d" });
    });
  });
});
