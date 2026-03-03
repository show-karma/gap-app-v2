/**
 * Tests that the usePublicCommenting query key includes communityId
 * to prevent cross-tenant cache collisions.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";

// Mock dependencies
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ address: null, authenticated: false }),
}));

jest.mock("@/src/features/application-comments/api/comments-service", () => ({
  CommentsService: {
    getPublicComments: jest.fn().mockResolvedValue([]),
    createPublicComment: jest.fn(),
    deleteComment: jest.fn(),
  },
}));

import { usePublicCommenting } from "@/src/features/application-comments/hooks/use-public-commenting";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("usePublicCommenting — query key scoping", () => {
  it("includes communityId in the query key", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    });

    renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "REF-001",
          communityId: "community-alpha",
          enabled: false,
        }),
      { wrapper: createWrapper(queryClient) }
    );

    const queries = queryClient.getQueryCache().getAll();
    expect(queries.length).toBe(1);
    const queryKey = queries[0].queryKey as string[];
    expect(queryKey).toContain("community-alpha");
    expect(queryKey).toContain("REF-001");
  });

  it("uses different cache entries for different communityIds with same referenceNumber", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    });
    const wrapper = createWrapper(queryClient);

    renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "REF-001",
          communityId: "community-alpha",
          enabled: false,
        }),
      { wrapper }
    );

    renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "REF-001",
          communityId: "community-beta",
          enabled: false,
        }),
      { wrapper }
    );

    const queries = queryClient.getQueryCache().getAll();
    // Two separate cache entries (one per communityId)
    expect(queries.length).toBe(2);

    const keys = queries.map((q) => q.queryKey as string[]);
    const alphaKey = keys.find((k) => k.includes("community-alpha"));
    const betaKey = keys.find((k) => k.includes("community-beta"));

    expect(alphaKey).toBeDefined();
    expect(betaKey).toBeDefined();
    // Keys must be different
    expect(JSON.stringify(alphaKey)).not.toBe(JSON.stringify(betaKey));
  });

  it("uses the same cache entry for identical communityId and referenceNumber", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    });
    const wrapper = createWrapper(queryClient);

    renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "REF-001",
          communityId: "community-alpha",
          enabled: false,
        }),
      { wrapper }
    );

    renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "REF-001",
          communityId: "community-alpha",
          enabled: false,
        }),
      { wrapper }
    );

    const queries = queryClient.getQueryCache().getAll();
    // Same key → one shared cache entry
    expect(queries.length).toBe(1);
  });

  it("query key has the shape [prefix, communityId, referenceNumber]", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    });

    renderHook(
      () =>
        usePublicCommenting({
          referenceNumber: "REF-42",
          communityId: "optimism",
          enabled: false,
        }),
      { wrapper: createWrapper(queryClient) }
    );

    const queries = queryClient.getQueryCache().getAll();
    const key = queries[0].queryKey as string[];

    // Shape: [QUERY_KEY_PREFIX, communityId, referenceNumber]
    expect(key[0]).toBe("wl-public-comments");
    expect(key[1]).toBe("optimism");
    expect(key[2]).toBe("REF-42");
  });
});
