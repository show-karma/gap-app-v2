import { act, renderHook } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useBackNavigation } from "../useBackNavigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockPrefetch = jest.fn();
const mockForward = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe("useBackNavigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
