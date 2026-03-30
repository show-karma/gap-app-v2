/**
 * Task 38: React Query cache key isolation tests.
 *
 * These tests verify that query keys include all necessary discriminators
 * (communityId, tenantId, auth flag) to prevent cross-tenant cache collisions.
 * Cache collisions are a silent data leak — user A sees user B's data because
 * the same cache key was reused across different contexts.
 */
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applicationKeys, wlQueryKeys } from "@/src/lib/query-keys";

describe("applicationKeys — cache key isolation", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("detail keys differ by communityId", () => {
    const keyA = applicationKeys.detail("optimism", "app-1", true);
    const keyB = applicationKeys.detail("arbitrum", "app-1", true);
    expect(keyA).not.toEqual(keyB);
  });

  it("detail keys differ by applicationId", () => {
    const keyA = applicationKeys.detail("optimism", "app-1", true);
    const keyB = applicationKeys.detail("optimism", "app-2", true);
    expect(keyA).not.toEqual(keyB);
  });

  it("detail keys differ by auth flag", () => {
    const authed = applicationKeys.detail("optimism", "app-1", true);
    const guest = applicationKeys.detail("optimism", "app-1", false);
    expect(authed).not.toEqual(guest);
  });

  it("all prefix is a proper subset of detail keys for invalidation", () => {
    const allKey = applicationKeys.all;
    const detailKey = applicationKeys.detail("optimism", "app-1", true);
    // detail key starts with the all prefix
    expect(detailKey[0]).toBe(allKey[0]);
  });

  it("invalidating all prefix removes all detail entries", () => {
    queryClient.setQueryData(applicationKeys.detail("optimism", "app-1", true), { data: "a" });
    queryClient.setQueryData(applicationKeys.detail("arbitrum", "app-2", false), { data: "b" });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(2);

    queryClient.removeQueries({ queryKey: applicationKeys.all });

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("setting data for one community does not pollute another", () => {
    const keyOptimism = applicationKeys.detail("optimism", "app-1", true);
    const keyArbitrum = applicationKeys.detail("arbitrum", "app-1", true);

    queryClient.setQueryData(keyOptimism, { community: "optimism" });

    expect(queryClient.getQueryData(keyOptimism)).toEqual({ community: "optimism" });
    expect(queryClient.getQueryData(keyArbitrum)).toBeUndefined();
  });
});

describe("wlQueryKeys.comments — cross-tenant isolation", () => {
  it("public comment keys include communityId", () => {
    const key = wlQueryKeys.comments.public("REF-001", "optimism");
    expect(key).toContain("optimism");
    expect(key).toContain("REF-001");
  });

  it("same referenceNumber in different communities produces different keys", () => {
    const keyA = wlQueryKeys.comments.public("REF-001", "optimism");
    const keyB = wlQueryKeys.comments.public("REF-001", "filecoin");
    expect(keyA).not.toEqual(keyB);
  });

  it("application comment keys include communityId", () => {
    const key = wlQueryKeys.comments.application("app-99", "optimism");
    expect(key).toContain("optimism");
    expect(key).toContain("app-99");
  });

  it("application comment keys differ across tenants", () => {
    const keyA = wlQueryKeys.comments.application("app-99", "optimism");
    const keyB = wlQueryKeys.comments.application("app-99", "scroll");
    expect(keyA).not.toEqual(keyB);
  });
});

describe("wlQueryKeys.programs — auth-aware caching", () => {
  it("list keys include address for authenticated users", () => {
    const key = wlQueryKeys.programs.list("optimism", "0xABC");
    expect(key).toContain("0xABC");
  });

  it("list keys use null for unauthenticated users", () => {
    const key = wlQueryKeys.programs.list("optimism", null);
    expect(key).toContain(null);
  });

  it("authenticated and unauthenticated keys differ", () => {
    const authed = wlQueryKeys.programs.list("optimism", "0xABC");
    const unauthed = wlQueryKeys.programs.list("optimism", null);
    expect(authed).not.toEqual(unauthed);
  });

  it("undefined address is normalized to null for stability", () => {
    const key1 = wlQueryKeys.programs.list("optimism", undefined);
    const key2 = wlQueryKeys.programs.list("optimism", null);
    expect(key1).toEqual(key2);
  });

  it("different communities produce different program keys", () => {
    const keyA = wlQueryKeys.programs.list("optimism", "0xABC");
    const keyB = wlQueryKeys.programs.list("filecoin", "0xABC");
    expect(keyA).not.toEqual(keyB);
  });
});
