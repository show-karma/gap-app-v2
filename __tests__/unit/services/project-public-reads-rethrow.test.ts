/**
 * @file The `rethrow` option of the three public project reads that back the
 * cached project pages (`services/project.cached.ts`). With it, a failed
 * request throws, so `"use cache"` does not store an empty result as the
 * project's data; a 404 still means "nothing there" and returns empty.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: { NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000" },
}));
vi.mock("@/components/Utilities/errorManager", () => ({ errorManager: vi.fn() }));
vi.mock("@/utilities/api/client", () => ({ api: { get: vi.fn() } }));

import { getProject } from "@/services/project.service";
import { getProjectGrants } from "@/services/project-grants.service";
import { getProjectImpacts } from "@/services/project-impacts.service";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";

const mockGet = vi.mocked(api.get);

const reads = [
  ["getProject", () => getProject("tally", { rethrow: true }), null],
  ["getProjectGrants", () => getProjectGrants("tally", { isAuthorized: false, rethrow: true }), []],
  [
    "getProjectImpacts",
    () => getProjectImpacts("tally", { isAuthorized: false, rethrow: true }),
    [],
  ],
] as const;

const defaults = [
  ["getProject", () => getProject("tally"), null],
  ["getProjectGrants", () => getProjectGrants("tally", { isAuthorized: false }), []],
  ["getProjectImpacts", () => getProjectImpacts("tally", { isAuthorized: false }), []],
] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("public project reads with rethrow", () => {
  it.each(reads)("%s throws when the request fails", async (_name, read) => {
    mockGet.mockRejectedValue(
      new HttpError(503, { endpoint: "/v2/projects/tally", method: "GET" })
    );

    await expect(read()).rejects.toThrow();
  });

  it.each(reads)("%s still returns empty for a 404", async (_name, read, empty) => {
    mockGet.mockRejectedValue(
      new HttpError(404, { endpoint: "/v2/projects/tally", method: "GET" })
    );

    await expect(read()).resolves.toEqual(empty);
  });
});

describe("public project reads without rethrow (client callers)", () => {
  it.each(defaults)("%s keeps returning empty on failure", async (_name, read, empty) => {
    mockGet.mockRejectedValue(
      new HttpError(503, { endpoint: "/v2/projects/tally", method: "GET" })
    );

    await expect(read()).resolves.toEqual(empty);
  });
});
