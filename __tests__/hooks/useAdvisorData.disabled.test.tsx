import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpError } from "@/utilities/api/errors";
import { defaultQueryOptions } from "@/utilities/queries/defaultOptions";

const fetchCurrentAdvisorMock = vi.fn();
const listResearchReportsMock = vi.fn();

vi.mock("@/services/donor-research.service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/donor-research.service")>()),
  fetchCurrentAdvisor: () => fetchCurrentAdvisorMock(),
  listResearchReports: (...args: unknown[]) => listResearchReportsMock(...args),
}));

import { useAdvisorData } from "@/components/Pages/Dashboard/v3/useAdvisorData";

// The app-wide defaults (retry 503 twice with 2s/4s backoff), so the test
// exercises the real policy the dashboard runs with.
function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: defaultQueryOptions } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function httpError(status: number, body?: unknown) {
  return new HttpError(status, { endpoint: "/v2/donor-research/me", method: "get", body });
}

describe("useAdvisorData when donor research is paused", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("hides the advisor tile and settles after a single /me call", async () => {
    fetchCurrentAdvisorMock.mockRejectedValue(
      httpError(503, { error: "donor_research_disabled", message: "paused" })
    );

    const { result } = renderHook(() => useAdvisorData(true), { wrapper: wrapper() });

    // Without the no-retry policy this stays loading through ~6s of backoff
    // and holds the whole dashboard's `isSettled` back with it.
    await waitFor(() => expect(result.current.advisorLoading).toBe(false), { timeout: 1000 });
    expect(result.current.isAdvisor).toBe(false);
    expect(fetchCurrentAdvisorMock).toHaveBeenCalledTimes(1);
    expect(listResearchReportsMock).not.toHaveBeenCalled();
  });

  it("still retries a plain 503 (upstream blip) under the default policy", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      fetchCurrentAdvisorMock.mockRejectedValue(httpError(503));
      const { result } = renderHook(() => useAdvisorData(true), { wrapper: wrapper() });

      await waitFor(() => expect(fetchCurrentAdvisorMock).toHaveBeenCalledTimes(1));
      await vi.advanceTimersByTimeAsync(10_000);
      await waitFor(() => expect(result.current.advisorLoading).toBe(false));
      expect(fetchCurrentAdvisorMock).toHaveBeenCalledTimes(3);
      expect(result.current.isAdvisor).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
