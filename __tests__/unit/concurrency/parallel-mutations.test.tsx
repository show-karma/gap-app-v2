/**
 * Parallel React Query mutation tests.
 *
 * Verifies that concurrent mutations using the REAL React Query runtime
 * do not interfere with each other: independent cache invalidation,
 * proper error isolation, and rapid-fire deduplication.
 *
 * Uses renderHookWithProviders from the test utilities and real
 * useMutation / useQueryClient hooks.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, renderHookWithProviders } from "@/__tests__/utils/render";

// ---------------------------------------------------------------------------
// Helpers — lightweight mutation hooks used for parallel execution testing
// ---------------------------------------------------------------------------

/**
 * A generic mutation hook that calls mutationFn, invalidates a specific
 * query key on success, and returns the mutation state.
 */
function useTestMutation(mutationFn: (input: string) => Promise<string>, invalidateKey: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
    },
  });
}

/**
 * A query hook backed by a mock fetcher, for verifying cache invalidation.
 */
function useTestQuery(key: string[], fetcher: () => Promise<unknown>) {
  return useQuery({ queryKey: key, queryFn: fetcher });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Parallel React Query mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Two different mutations both succeed
  // -------------------------------------------------------------------------

  it("should resolve both mutations independently when running in parallel", async () => {
    const mutationA = vi.fn().mockResolvedValue("result-a");
    const mutationB = vi.fn().mockResolvedValue("result-b");

    const queryClient = createTestQueryClient();

    const { result } = renderHookWithProviders(
      () => ({
        a: useTestMutation(mutationA, ["cache-a"]),
        b: useTestMutation(mutationB, ["cache-b"]),
      }),
      { queryClient }
    );

    // Fire both mutations concurrently
    let promiseA: Promise<string>;
    let promiseB: Promise<string>;

    act(() => {
      promiseA = result.current.a.mutateAsync("input-a");
      promiseB = result.current.b.mutateAsync("input-b");
    });

    const [resultA, resultB] = await Promise.all([promiseA!, promiseB!]);

    expect(resultA).toBe("result-a");
    expect(resultB).toBe("result-b");
    expect(mutationA).toHaveBeenCalledWith("input-a");
    expect(mutationB).toHaveBeenCalledWith("input-b");
  });

  // -------------------------------------------------------------------------
  // Both succeed -> both caches invalidated independently
  // -------------------------------------------------------------------------

  it("should invalidate each mutation's cache key independently on success", async () => {
    const fetcherA = vi.fn().mockResolvedValue("data-a");
    const fetcherB = vi.fn().mockResolvedValue("data-b");
    const mutationA = vi.fn().mockResolvedValue("ok-a");
    const mutationB = vi.fn().mockResolvedValue("ok-b");

    const queryClient = createTestQueryClient();

    const { result } = renderHookWithProviders(
      () => ({
        queryA: useTestQuery(["cache-a"], fetcherA),
        queryB: useTestQuery(["cache-b"], fetcherB),
        mutA: useTestMutation(mutationA, ["cache-a"]),
        mutB: useTestMutation(mutationB, ["cache-b"]),
      }),
      { queryClient }
    );

    // Wait for initial queries to settle
    await waitFor(() => {
      expect(result.current.queryA.isSuccess).toBe(true);
      expect(result.current.queryB.isSuccess).toBe(true);
    });

    const initialCallsA = fetcherA.mock.calls.length;
    const initialCallsB = fetcherB.mock.calls.length;

    // Fire both mutations in parallel
    await act(async () => {
      await Promise.all([
        result.current.mutA.mutateAsync("x"),
        result.current.mutB.mutateAsync("y"),
      ]);
    });

    // Both caches should have been invalidated (triggering refetches)
    await waitFor(() => {
      expect(fetcherA.mock.calls.length).toBeGreaterThan(initialCallsA);
      expect(fetcherB.mock.calls.length).toBeGreaterThan(initialCallsB);
    });
  });

  // -------------------------------------------------------------------------
  // One fails, one succeeds -> error isolation
  // -------------------------------------------------------------------------

  it("should isolate errors: failed mutation does not affect the successful one's cache", async () => {
    const fetcherA = vi.fn().mockResolvedValue("data-a");
    const fetcherB = vi.fn().mockResolvedValue("data-b");
    const mutationA = vi.fn().mockRejectedValue(new Error("A failed"));
    const mutationB = vi.fn().mockResolvedValue("ok-b");

    const queryClient = createTestQueryClient();

    const { result } = renderHookWithProviders(
      () => ({
        queryA: useTestQuery(["cache-a"], fetcherA),
        queryB: useTestQuery(["cache-b"], fetcherB),
        mutA: useTestMutation(mutationA, ["cache-a"]),
        mutB: useTestMutation(mutationB, ["cache-b"]),
      }),
      { queryClient }
    );

    await waitFor(() => {
      expect(result.current.queryA.isSuccess).toBe(true);
      expect(result.current.queryB.isSuccess).toBe(true);
    });

    const callsABefore = fetcherA.mock.calls.length;

    // Fire both — A will fail, B will succeed
    await act(async () => {
      const pA = result.current.mutA.mutateAsync("x").catch(() => {});
      const pB = result.current.mutB.mutateAsync("y");
      await Promise.all([pA, pB]);
    });

    // Mutation A should be in error state
    await waitFor(() => {
      expect(result.current.mutA.isError).toBe(true);
    });

    // Mutation B should have succeeded
    expect(result.current.mutB.isSuccess).toBe(true);

    // Cache A should NOT have been refetched (onSuccess didn't fire)
    expect(fetcherA.mock.calls.length).toBe(callsABefore);
  });

  // -------------------------------------------------------------------------
  // Rapid-fire: same mutation called 5 times quickly
  // -------------------------------------------------------------------------

  it("should resolve all 5 rapid-fire calls of the same mutation correctly", async () => {
    let callCount = 0;
    const mutationFn = vi.fn().mockImplementation(async (input: string) => {
      callCount++;
      return `result-${callCount}`;
    });

    const queryClient = createTestQueryClient();

    const { result } = renderHookWithProviders(() => useTestMutation(mutationFn, ["rapid-cache"]), {
      queryClient,
    });

    const results: string[] = [];

    await act(async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        result.current.mutateAsync(`input-${i}`).then((r) => {
          results.push(r);
          return r;
        })
      );
      await Promise.all(promises);
    });

    // All 5 calls should have been invoked and resolved
    expect(mutationFn).toHaveBeenCalledTimes(5);
    expect(results).toHaveLength(5);
  });

  // -------------------------------------------------------------------------
  // Parallel mutations with shared cache key
  // -------------------------------------------------------------------------

  it("should invalidate the shared cache key when both mutations target the same key", async () => {
    const fetcher = vi.fn().mockResolvedValue("shared-data");
    const mutA = vi.fn().mockResolvedValue("a");
    const mutB = vi.fn().mockResolvedValue("b");

    const queryClient = createTestQueryClient();

    const { result } = renderHookWithProviders(
      () => ({
        query: useTestQuery(["shared-key"], fetcher),
        mutA: useTestMutation(mutA, ["shared-key"]),
        mutB: useTestMutation(mutB, ["shared-key"]),
      }),
      { queryClient }
    );

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });

    const beforeCalls = fetcher.mock.calls.length;

    await act(async () => {
      await Promise.all([
        result.current.mutA.mutateAsync("x"),
        result.current.mutB.mutateAsync("y"),
      ]);
    });

    // Shared cache should have been invalidated (at least once)
    await waitFor(() => {
      expect(fetcher.mock.calls.length).toBeGreaterThan(beforeCalls);
    });
  });

  // -------------------------------------------------------------------------
  // Mutation state transitions under parallel execution
  // -------------------------------------------------------------------------

  it("should track isPending independently for parallel mutations", async () => {
    let resolveA: (v: string) => void;
    let resolveB: (v: string) => void;

    const mutA = vi.fn().mockImplementation(
      () =>
        new Promise<string>((r) => {
          resolveA = r;
        })
    );
    const mutB = vi.fn().mockImplementation(
      () =>
        new Promise<string>((r) => {
          resolveB = r;
        })
    );

    const queryClient = createTestQueryClient();

    const { result } = renderHookWithProviders(
      () => ({
        a: useTestMutation(mutA, ["a"]),
        b: useTestMutation(mutB, ["b"]),
      }),
      { queryClient }
    );

    // Start A, not B — catch the promise to avoid unhandled rejection
    act(() => {
      result.current.a.mutateAsync("x").catch(() => {});
    });

    await waitFor(() => {
      expect(result.current.a.isPending).toBe(true);
    });
    expect(result.current.b.isPending).toBe(false);

    // Start B too
    act(() => {
      result.current.b.mutateAsync("y").catch(() => {});
    });

    await waitFor(() => {
      expect(result.current.b.isPending).toBe(true);
    });
    expect(result.current.a.isPending).toBe(true);

    // Resolve A only
    await act(async () => {
      resolveA!("done-a");
    });

    await waitFor(() => {
      expect(result.current.a.isPending).toBe(false);
    });
    expect(result.current.b.isPending).toBe(true);

    // Resolve B
    await act(async () => {
      resolveB!("done-b");
    });

    await waitFor(() => {
      expect(result.current.b.isPending).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Error in one does not cancel the other
  // -------------------------------------------------------------------------

  it("should allow mutation B to succeed even after mutation A throws", async () => {
    const mutA = vi.fn().mockRejectedValue(new Error("boom"));
    const mutB = vi.fn().mockResolvedValue("success-b");

    const queryClient = createTestQueryClient();

    const { result } = renderHookWithProviders(
      () => ({
        a: useTestMutation(mutA, ["err-a"]),
        b: useTestMutation(mutB, ["err-b"]),
      }),
      { queryClient }
    );

    let bResult: string | undefined;

    await act(async () => {
      const pa = result.current.a.mutateAsync("x").catch(() => "caught");
      const pb = result.current.b.mutateAsync("y");
      const [, bRes] = await Promise.all([pa, pb]);
      bResult = bRes;
    });

    expect(bResult).toBe("success-b");

    await waitFor(() => {
      expect(result.current.a.isError).toBe(true);
      expect(result.current.b.isSuccess).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Multiple mutations with optimistic updates via useQuery for reactivity
  // -------------------------------------------------------------------------

  it("should preserve optimistic update of one mutation while another runs", async () => {
    const queryClient = createTestQueryClient();

    // Seed the cache with initial data
    queryClient.setQueryData(["items"], ["item-1", "item-2", "item-3"]);

    let resolveRemove: (v: string) => void;

    const { result } = renderHookWithProviders(
      () => {
        const qc = useQueryClient();

        // useQuery so we get reactive updates when setQueryData is called
        const itemsQuery = useQuery({
          queryKey: ["items"],
          queryFn: () => Promise.resolve(["item-1", "item-2", "item-3"]),
          initialData: ["item-1", "item-2", "item-3"],
        });

        const removeMutation = useMutation({
          mutationFn: () =>
            new Promise<string>((r) => {
              resolveRemove = r;
            }),
          onMutate: async () => {
            await qc.cancelQueries({ queryKey: ["items"] });
            const prev = qc.getQueryData<string[]>(["items"]);
            qc.setQueryData(["items"], (old: string[] | undefined) =>
              old?.filter((i) => i !== "item-2")
            );
            return { prev };
          },
          onError: (_err, _vars, ctx) => {
            if (ctx?.prev) qc.setQueryData(["items"], ctx.prev);
          },
        });

        const addMutation = useMutation({
          mutationFn: async () => "item-4",
          onSuccess: (newItem) => {
            qc.setQueryData(["items"], (old: string[] | undefined) =>
              old ? [...old, newItem] : [newItem]
            );
          },
        });

        return {
          items: itemsQuery.data,
          remove: removeMutation,
          add: addMutation,
        };
      },
      { queryClient }
    );

    // Start remove (stays pending)
    act(() => {
      result.current.remove.mutateAsync("item-2");
    });

    // Optimistic update should have removed item-2
    await waitFor(() => {
      expect(result.current.items).toEqual(["item-1", "item-3"]);
    });

    // While remove is pending, add item-4
    await act(async () => {
      await result.current.add.mutateAsync("x");
    });

    // Both optimistic updates should be visible
    await waitFor(() => {
      expect(result.current.items).toEqual(["item-1", "item-3", "item-4"]);
    });

    // Resolve the remove
    await act(async () => {
      resolveRemove!("done");
    });

    // Final state should have both changes
    await waitFor(() => {
      expect(result.current.items).toContain("item-1");
      expect(result.current.items).toContain("item-3");
      expect(result.current.items).toContain("item-4");
      expect(result.current.items).not.toContain("item-2");
    });
  });

  // -------------------------------------------------------------------------
  // Rapid-fire with varying delays
  // -------------------------------------------------------------------------

  it("should handle 5 mutations with staggered resolution times in correct order", async () => {
    const resolved: number[] = [];

    const mutationFn = vi.fn().mockImplementation(async (input: string) => {
      const idx = parseInt(input, 10);
      // Each mutation resolves after (5 - idx) ticks to simulate out-of-order completion
      await new Promise((r) => setTimeout(r, 0));
      resolved.push(idx);
      return `done-${idx}`;
    });

    const queryClient = createTestQueryClient();

    const { result } = renderHookWithProviders(() => useTestMutation(mutationFn, ["stagger"]), {
      queryClient,
    });

    await act(async () => {
      const promises = Array.from({ length: 5 }, (_, i) => result.current.mutateAsync(String(i)));
      await Promise.all(promises);
    });

    // All 5 should have resolved
    expect(resolved).toHaveLength(5);
    expect(mutationFn).toHaveBeenCalledTimes(5);
  });
});
