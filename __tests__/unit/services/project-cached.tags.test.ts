/**
 * @file Cache tags and lifetimes of the cached project-page loaders. The
 * indexer reports changed projects by uid, so every entry, including one for a
 * page opened by slug, must carry the uid's tag (and the slug's).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cacheTagMock, cacheLifeMock, getProjectMock, getProjectGrantsMock } = vi.hoisted(() => ({
  cacheTagMock: vi.fn(),
  cacheLifeMock: vi.fn(),
  getProjectMock: vi.fn(),
  getProjectGrantsMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ cacheTag: cacheTagMock, cacheLife: cacheLifeMock }));
vi.mock("@/services/project.service", () => ({ getProject: getProjectMock }));
vi.mock("@/services/project-grants.service", () => ({ getProjectGrants: getProjectGrantsMock }));
vi.mock("@/services/project-impacts.service", () => ({ getProjectImpacts: vi.fn() }));
vi.mock("@/services/project-updates.service", () => ({ getProjectUpdates: vi.fn() }));
vi.mock("@/utilities/queries/getProjectCachedData", () => ({ getProjectCachedData: vi.fn() }));
vi.mock("@/utilities/queries/v2/getCommunityData.cached", () => ({
  getCommunityDetailsCached: vi.fn(),
}));

import {
  getProjectCached,
  getProjectGrantsCached,
  PROJECT_PAGE_CACHE_LIFE,
} from "@/services/project.cached";

const UID = `0x${"A".repeat(64)}`;
const project = { uid: UID, details: { slug: "tally" } };

const tags = () => cacheTagMock.mock.calls.map(([tag]) => tag);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getProjectCached", () => {
  it("tags the entry with the routed slug, the uid and the canonical slug", async () => {
    getProjectMock.mockResolvedValue(project);

    await getProjectCached("Tally");

    expect(new Set(tags())).toEqual(new Set(["project:tally", `project:${UID.toLowerCase()}`]));
  });

  it("reaches the slug's entries when the page was opened by uid", async () => {
    getProjectMock.mockResolvedValue(project);

    await getProjectCached(UID);

    expect(tags()).toContain("project:tally");
  });

  it("asks the read to throw on failure instead of caching a missing project", async () => {
    getProjectMock.mockResolvedValue(project);

    await getProjectCached("tally");

    expect(getProjectMock).toHaveBeenCalledWith("tally", { rethrow: true });
  });

  it("uses the project-page lifetime for a project that exists", async () => {
    getProjectMock.mockResolvedValue(project);

    await getProjectCached("tally");

    expect(cacheLifeMock).toHaveBeenCalledWith(PROJECT_PAGE_CACHE_LIFE);
  });

  it("caches a missing project only briefly", async () => {
    getProjectMock.mockResolvedValue(null);

    await getProjectCached("not-yet-created");

    expect(cacheLifeMock).toHaveBeenCalledWith("minutes");
    expect(tags()).toEqual(["project:not-yet-created"]);
  });

  it("propagates a failed read so it is not stored", async () => {
    getProjectMock.mockRejectedValue(new Error("indexer down"));

    await expect(getProjectCached("tally")).rejects.toThrow("indexer down");
  });
});

describe("getProjectGrantsCached", () => {
  it("carries the project's uid tag although grants responses have none", async () => {
    getProjectMock.mockResolvedValue(project);
    getProjectGrantsMock.mockResolvedValue([]);

    await getProjectGrantsCached("tally");

    expect(tags()).toContain(`project:${UID.toLowerCase()}`);
    expect(getProjectGrantsMock).toHaveBeenCalledWith("tally", {
      isAuthorized: false,
      rethrow: true,
    });
  });

  it("still loads the grants, cached briefly, when the project lookup fails", async () => {
    getProjectMock.mockRejectedValue(new Error("indexer down"));
    getProjectGrantsMock.mockResolvedValue([{ uid: "0xgrant" }]);

    await expect(getProjectGrantsCached("tally")).resolves.toEqual([{ uid: "0xgrant" }]);
    expect(tags()).toEqual(["project:tally"]);
    expect(cacheLifeMock).toHaveBeenLastCalledWith("minutes");
  });

  it("uses the project-page lifetime once the project is identified", async () => {
    getProjectMock.mockResolvedValue(project);
    getProjectGrantsMock.mockResolvedValue([]);

    await getProjectGrantsCached("tally");

    expect(cacheLifeMock).toHaveBeenLastCalledWith(PROJECT_PAGE_CACHE_LIFE);
  });
});
