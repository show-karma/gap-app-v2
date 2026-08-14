import { describe, expect, it } from "vitest";
import type { ExplorerSortByOptions, ExplorerSortOrder } from "@/types/explorer";
import {
  buildProjectsPageHref,
  parseProjectsExplorerRequest,
} from "@/utilities/projects-explorer-request";

/**
 * RED (pure projects-explorer request parser + crawlable page href builder,
 * ADR 0001). Pins the contract for the not-yet-created module
 * utilities/projects-explorer-request.ts: strict parsing of Next search-param
 * records into an effective explorer request, and a deterministic href builder
 * that preserves only non-default filters, encodes values, orders params
 * predictably, omits page for page 1, and always targets #browse-projects.
 *
 * The production module does not exist yet, so importing it fails — the whole
 * suite is a missing-module RED.
 */

type SearchParams = Record<string, string | string[] | undefined>;

interface ProjectsExplorerState {
  page: number;
  q: string;
  sortBy: ExplorerSortByOptions;
  sortOrder: ExplorerSortOrder;
  raisingFunds: boolean;
}

const DEFAULT_STATE: ProjectsExplorerState = {
  page: 1,
  q: "",
  sortBy: "updatedAt",
  sortOrder: "desc",
  raisingFunds: false,
};

const VALID_SORT_BY: ExplorerSortByOptions[] = [
  "createdAt",
  "updatedAt",
  "title",
  "noOfGrants",
  "noOfProjectMilestones",
  "noOfGrantMilestones",
];

describe("parseProjectsExplorerRequest", () => {
  it("returns the default effective state for an empty record", () => {
    expect(parseProjectsExplorerRequest({})).toEqual(DEFAULT_STATE);
  });

  it("parses a fully-populated record into its effective state", () => {
    const input: SearchParams = {
      page: "3",
      q: "dao",
      sortBy: "title",
      sortOrder: "asc",
      raisingFunds: "true",
    };

    expect(parseProjectsExplorerRequest(input)).toEqual({
      page: 3,
      q: "dao",
      sortBy: "title",
      sortOrder: "asc",
      raisingFunds: true,
    });
  });

  describe("page", () => {
    it.each([
      ["1", 1],
      ["3", 3],
      ["42", 42],
      ["999", 999],
    ])("accepts digits-only positive integer %s", (raw, expected) => {
      expect(parseProjectsExplorerRequest({ page: raw }).page).toBe(expected);
    });

    it.each<[string, SearchParams]>([
      ["zero", { page: "0" }],
      ["negative", { page: "-1" }],
      ["decimal", { page: "1.5" }],
      ["exponent", { page: "1e3" }],
      ["leading whitespace", { page: " 2" }],
      ["surrounding whitespace", { page: " 2 " }],
      ["empty string", { page: "" }],
      ["non-numeric", { page: "abc" }],
      ["above MAX_SAFE_INTEGER", { page: "9007199254740992" }],
      ["array", { page: ["2"] }],
      ["undefined", { page: undefined }],
    ])("falls back to 1 for %s", (_name, input) => {
      expect(parseProjectsExplorerRequest(input).page).toBe(1);
    });
  });

  describe("q", () => {
    it("keeps a string query", () => {
      expect(parseProjectsExplorerRequest({ q: "dao" }).q).toBe("dao");
    });

    it("falls back to empty for an array query", () => {
      expect(parseProjectsExplorerRequest({ q: ["a", "b"] }).q).toBe("");
    });

    it("falls back to empty for an undefined query", () => {
      expect(parseProjectsExplorerRequest({ q: undefined }).q).toBe("");
    });
  });

  describe("sortBy", () => {
    it.each(VALID_SORT_BY)("accepts the valid sortBy %s", (value) => {
      expect(parseProjectsExplorerRequest({ sortBy: value }).sortBy).toBe(value);
    });

    it.each<[string, SearchParams]>([
      ["unknown value", { sortBy: "popularity" }],
      ["array", { sortBy: ["title"] }],
      ["undefined", { sortBy: undefined }],
    ])("defaults to updatedAt for %s", (_name, input) => {
      expect(parseProjectsExplorerRequest(input).sortBy).toBe("updatedAt");
    });
  });

  describe("sortOrder", () => {
    it.each<[ExplorerSortOrder]>([["asc"], ["desc"]])("accepts %s", (value) => {
      expect(parseProjectsExplorerRequest({ sortOrder: value }).sortOrder).toBe(value);
    });

    it.each<[string, SearchParams]>([
      ["uppercase", { sortOrder: "ASC" }],
      ["unknown value", { sortOrder: "sideways" }],
      ["array", { sortOrder: ["asc"] }],
      ["undefined", { sortOrder: undefined }],
    ])("defaults to desc for %s", (_name, input) => {
      expect(parseProjectsExplorerRequest(input).sortOrder).toBe("desc");
    });
  });

  describe("raisingFunds", () => {
    it("is true only for the literal string 'true'", () => {
      expect(parseProjectsExplorerRequest({ raisingFunds: "true" }).raisingFunds).toBe(true);
    });

    it.each<[string, SearchParams]>([
      ["false", { raisingFunds: "false" }],
      ["one", { raisingFunds: "1" }],
      ["uppercase TRUE", { raisingFunds: "TRUE" }],
      ["array", { raisingFunds: ["true"] }],
      ["undefined", { raisingFunds: undefined }],
    ])("is false for %s", (_name, input) => {
      expect(parseProjectsExplorerRequest(input).raisingFunds).toBe(false);
    });
  });
});

describe("buildProjectsPageHref", () => {
  it("builds the bare canonical href for the default state at page 1", () => {
    expect(buildProjectsPageHref(DEFAULT_STATE, 1)).toBe("/projects#browse-projects");
  });

  it("adds only page for a later page when no filters are active", () => {
    expect(buildProjectsPageHref(DEFAULT_STATE, 2)).toBe("/projects?page=2#browse-projects");
  });

  it("omits page at target 1 while preserving active filters", () => {
    const state: ProjectsExplorerState = { ...DEFAULT_STATE, q: "dao" };
    expect(buildProjectsPageHref(state, 1)).toBe("/projects?q=dao#browse-projects");
  });

  it("preserves all non-default filters in deterministic order with page last for a later page", () => {
    const state: ProjectsExplorerState = {
      page: 1,
      q: "dao",
      sortBy: "title",
      sortOrder: "asc",
      raisingFunds: true,
    };

    expect(buildProjectsPageHref(state, 3)).toBe(
      "/projects?q=dao&sortBy=title&sortOrder=asc&raisingFunds=true&page=3#browse-projects"
    );
  });

  it("omits default-valued filters (updatedAt / desc / empty q / raisingFunds false)", () => {
    const state: ProjectsExplorerState = { ...DEFAULT_STATE, sortBy: "noOfGrants" };
    expect(buildProjectsPageHref(state, 1)).toBe("/projects?sortBy=noOfGrants#browse-projects");
  });

  it("URL-encodes filter values", () => {
    const state: ProjectsExplorerState = { ...DEFAULT_STATE, q: "grant dao" };
    expect(buildProjectsPageHref(state, 1)).toBe("/projects?q=grant%20dao#browse-projects");
  });
});
