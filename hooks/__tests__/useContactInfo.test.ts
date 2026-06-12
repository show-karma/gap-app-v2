import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";

vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({ address: "0xViewer" })),
}));

vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: vi.fn(),
}));

vi.mock("@/utilities/fetchData", () => ({
  default: vi.fn(),
}));

vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

vi.mock("@/utilities/queries/defaultOptions", () => ({
  defaultQueryOptions: { staleTime: 0, gcTime: 0, retry: false },
}));

import { errorManager } from "@/components/Utilities/errorManager";
import { useProjectAuthorization } from "@/hooks/useProjectAuthorization";
import fetchData from "@/utilities/fetchData";
import { useContactInfo } from "../useContactInfo";

const mockUseProjectAuthorization = useProjectAuthorization as unknown as vi.Mock;
const mockFetchData = fetchData as unknown as vi.Mock;
const mockErrorManager = errorManager as unknown as vi.Mock;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useContactInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: true, isLoading: false });
  });

  it("does not fetch while authorization is still loading", () => {
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: false, isLoading: true });
    renderHook(() => useContactInfo("proj-1"), { wrapper: createWrapper() });
    expect(mockFetchData).not.toHaveBeenCalled();
  });

  it("does not fetch for resolved-unauthorized users", () => {
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: false, isLoading: false });
    renderHook(() => useContactInfo("proj-1"), { wrapper: createWrapper() });
    expect(mockFetchData).not.toHaveBeenCalled();
  });

  it("does not fetch when the caller's isAuthorized is false even if resolved-true", () => {
    mockUseProjectAuthorization.mockReturnValue({ isAuthorized: true, isLoading: false });
    renderHook(() => useContactInfo("proj-1", false), { wrapper: createWrapper() });
    expect(mockFetchData).not.toHaveBeenCalled();
  });

  it("classifies a 403 as denial-data: returns null without logging", async () => {
    mockFetchData.mockResolvedValue([null, "Address is not a project admin", null, 403]);

    const { result } = renderHook(() => useContactInfo("proj-1"), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toBeNull();
    expect(mockErrorManager).not.toHaveBeenCalled();
  });

  it("still surfaces non-403 failures through errorManager", async () => {
    mockFetchData.mockResolvedValue([null, "Internal Server Error", null, 500]);

    const { result } = renderHook(() => useContactInfo("proj-1"), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockErrorManager).toHaveBeenCalled();
    });
    expect(result.current.data).toBeNull();
  });

  it("maps contacts on success", async () => {
    mockFetchData.mockResolvedValue([
      [{ _id: { $oid: "c1" }, name: "Ada", email: "ada@x.io", telegram: "@ada" }],
      null,
      null,
      200,
    ]);

    const { result } = renderHook(() => useContactInfo("proj-1"), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toEqual([
        { id: "c1", name: "Ada", email: "ada@x.io", telegram: "@ada" },
      ]);
    });
    expect(mockErrorManager).not.toHaveBeenCalled();
  });
});
