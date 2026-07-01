import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listAdvisorsMock = vi.fn();
const getAdminReportMock = vi.fn();

vi.mock("@/services/donor-research.service", () => ({
  listAdvisors: (...args: unknown[]) => listAdvisorsMock(...args),
  getAdminReport: (...args: unknown[]) => getAdminReportMock(...args),
}));

import { useAdminAdvisors, useAdminReport } from "@/hooks/useAdminDonorResearch";

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAdminDonorResearch hooks", () => {
  beforeEach(() => {
    listAdvisorsMock.mockReset();
    getAdminReportMock.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("useAdminAdvisors resolves the advisors list", async () => {
    const payload = { items: [], total: 0, page: 1, limit: 20 };
    listAdvisorsMock.mockResolvedValue(payload);

    const { result } = renderHook(() => useAdminAdvisors({ page: 1, limit: 20 }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(payload);
    expect(listAdvisorsMock).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it("useAdminReport stays disabled when reportId is null", () => {
    const { result } = renderHook(() => useAdminReport(null), {
      wrapper: wrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(getAdminReportMock).not.toHaveBeenCalled();
  });

  it("useAdminReport fetches when given an id", async () => {
    getAdminReportMock.mockResolvedValue({ id: "r1" });

    const { result } = renderHook(() => useAdminReport("r1"), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getAdminReportMock).toHaveBeenCalledWith("r1");
  });
});
