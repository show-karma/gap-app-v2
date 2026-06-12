/**
 * useNonprofitSubmission tests
 *
 * The hook wraps a public (unauthenticated) POST to the gap-indexer's
 * nonprofit-submissions intake. fetchData returns the project's standard
 * [data, error, pageInfo, status] tuple; the hook must surface the error
 * arm as a thrown Error so React Query's isError state drives the form UI.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNonprofitSubmission } from "../hooks/use-nonprofit-submission";

const mockFetchData = vi.fn();
vi.mock("@/utilities/fetchData", () => ({
  default: (...args: unknown[]) => mockFetchData(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const payload = {
  websiteUrl: "https://yournonprofit.org",
  email: "you@yournonprofit.org",
};

describe("useNonprofitSubmission", () => {
  beforeEach(() => {
    mockFetchData.mockReset();
  });

  it("posts the payload to the public V2 submission endpoint without auth", async () => {
    mockFetchData.mockResolvedValue([{ id: "sub_1", createdAt: "2026-06-10" }, null, null, 201]);

    const { result } = renderHook(() => useNonprofitSubmission(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetchData).toHaveBeenCalledWith(
      "/v2/nonprofit-submissions/submit",
      "POST",
      payload,
      {},
      {},
      false
    );
    expect(result.current.data).toEqual({ id: "sub_1", createdAt: "2026-06-10" });
  });

  it("surfaces the tuple error arm as a mutation error", async () => {
    mockFetchData.mockResolvedValue([null, "Validation failed", null, 422]);

    const { result } = renderHook(() => useNonprofitSubmission(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Validation failed");
  });

  it("treats a null data response without an error string as a failure", async () => {
    mockFetchData.mockResolvedValue([null, null, null, 500]);

    const { result } = renderHook(() => useNonprofitSubmission(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain("500");
  });
});
