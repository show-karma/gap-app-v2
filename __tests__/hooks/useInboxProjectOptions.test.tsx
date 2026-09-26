import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInboxProjectOptions } from "@/hooks/useInboxProjectOptions";

const apiGet = vi.fn();
vi.mock("@/utilities/api/client", () => ({
  api: { get: (...args: unknown[]) => apiGet(...args) },
}));

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useInboxProjectOptions", () => {
  beforeEach(() => apiGet.mockReset());

  it("loads program-scoped project names from the lightweight endpoint", async () => {
    apiGet.mockResolvedValueOnce({
      options: [{ id: "project-a", title: "Alpha" }],
    });

    const { result } = renderHook(() => useInboxProjectOptions("filecoin", "774"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "project-a", title: "Alpha" }]);
    expect(apiGet.mock.calls.map(([url]) => url)).toEqual([
      "/v2/milestone-action-items/filecoin/projects?programId=774",
    ]);
  });
});
