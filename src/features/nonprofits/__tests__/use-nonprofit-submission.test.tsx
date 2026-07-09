/**
 * useNonprofitSubmission tests
 *
 * The hook wraps a public (unauthenticated) POST to the gap-indexer's
 * nonprofit-submissions intake via the typed api client. api.post throws on
 * failure; the hook must surface that rejection as the mutation error so
 * React Query's isError state drives the form UI.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNonprofitSubmission } from "../hooks/use-nonprofit-submission";

vi.mock("@/utilities/api/client", () => ({
  api: { post: vi.fn() },
}));

import { api } from "@/utilities/api/client";

const mockApiPost = api.post as unknown as vi.Mock;

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
    mockApiPost.mockReset();
  });

  it("posts the payload to the public V2 submission endpoint without auth", async () => {
    mockApiPost.mockResolvedValue({ id: "sub_1", createdAt: "2026-06-10" });

    const { result } = renderHook(() => useNonprofitSubmission(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApiPost).toHaveBeenCalledWith("/v2/nonprofit-submissions/submit", payload, {
      isAuthorized: false,
    });
    expect(result.current.data).toEqual({ id: "sub_1", createdAt: "2026-06-10" });
  });

  it("surfaces the api rejection as a mutation error", async () => {
    mockApiPost.mockRejectedValue(new Error("Validation failed"));

    const { result } = renderHook(() => useNonprofitSubmission(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Validation failed");
  });

  it("treats a server failure as a mutation error", async () => {
    mockApiPost.mockRejectedValue(new Error("Request failed with status 500"));

    const { result } = renderHook(() => useNonprofitSubmission(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain("500");
  });
});
