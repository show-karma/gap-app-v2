import { act, renderHook } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useBackNavigation } from "../useBackNavigation";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => "/"),
}));

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
const mockPrefetch = vi.fn();
const mockForward = vi.fn();
const mockUseRouter = useRouter as vi.MockedFunction<typeof useRouter>;

describe("useBackNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: mockBack,
      replace: mockReplace,
      refresh: mockRefresh,
      prefetch: mockPrefetch,
      forward: mockForward,
    });
    window.history.replaceState({}, "", window.location.href);
  });

  it("should push to fallback route by default", () => {
    const { result } = renderHook(() => useBackNavigation({ fallbackRoute: "/fallback" }));

    act(() => {
      result.current();
    });

    expect(mockPush).toHaveBeenCalledWith("/fallback");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("should go back when history index exists and preferHistoryBack is enabled", () => {
    window.history.replaceState({ idx: 2 }, "", window.location.href);
    const { result } = renderHook(() =>
      useBackNavigation({ fallbackRoute: "/fallback", preferHistoryBack: true })
    );

    act(() => {
      result.current();
    });

    expect(mockBack).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should use fallback when history index is missing and preferHistoryBack is enabled", () => {
    window.history.replaceState({}, "", window.location.href);
    const { result } = renderHook(() =>
      useBackNavigation({ fallbackRoute: "/fallback", preferHistoryBack: true })
    );

    act(() => {
      result.current();
    });

    expect(mockPush).toHaveBeenCalledWith("/fallback");
    expect(mockBack).not.toHaveBeenCalled();
  });
});
