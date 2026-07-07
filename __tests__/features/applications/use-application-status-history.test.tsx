/**
 * DEV-517: authenticated viewers re-fetch the application (via the service) so
 * the backend can return the private status-change reasons. Guests are
 * unauthenticated, so the query must never run.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApplicationStatusHistory } from "@/src/features/applications/hooks/use-application-status-history";
import { getApplicationStatusHistory } from "@/src/features/applications/services/status-history.service";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/src/features/applications/services/status-history.service", () => ({
  getApplicationStatusHistory: vi.fn(),
}));

const mockUseAuth = useAuth as unknown as vi.Mock;
const mockGetStatusHistory = getApplicationStatusHistory as unknown as vi.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const statusHistory = [
  { status: "rejected", timestamp: "2026-02-25T00:00:00.000Z", reason: "why" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStatusHistory.mockResolvedValue(statusHistory);
});

describe("useApplicationStatusHistory", () => {
  it("should fetch status history through the service when authenticated", async () => {
    mockUseAuth.mockReturnValue({ authenticated: true, ready: true });

    const { result } = renderHook(() => useApplicationStatusHistory("REF-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.statusHistory).toEqual(statusHistory));
    expect(mockGetStatusHistory).toHaveBeenCalledWith("REF-123");
  });

  it("should not fetch when the viewer is not authenticated", async () => {
    mockUseAuth.mockReturnValue({ authenticated: false, ready: true });

    const { result } = renderHook(() => useApplicationStatusHistory("REF-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetStatusHistory).not.toHaveBeenCalled();
  });
});
