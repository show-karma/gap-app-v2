import { act, renderHook } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { useUrlTabState } from "../use-url-tab-state";

vi.mock("next/navigation", () => ({ useSearchParams: vi.fn() }));

function mockParams(qs: string) {
  (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue(new URLSearchParams(qs));
}

describe("useUrlTabState", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/app");
  });

  it("defaults to details when there is no tab param", () => {
    mockParams("");
    const { result } = renderHook(() => useUrlTabState());
    expect(result.current[0]).toBe("details");
  });

  it("reads the initial tab from the query string", () => {
    mockParams("tab=comments");
    const { result } = renderHook(() => useUrlTabState());
    expect(result.current[0]).toBe("comments");
  });

  it("falls back to details for an unknown tab param", () => {
    mockParams("tab=not-a-tab");
    const { result } = renderHook(() => useUrlTabState());
    expect(result.current[0]).toBe("details");
  });

  it("updates state and writes the tab to the URL when switching", () => {
    mockParams("");
    const { result } = renderHook(() => useUrlTabState());
    act(() => result.current[1]("milestones"));
    expect(result.current[0]).toBe("milestones");
    expect(window.location.search).toContain("tab=milestones");
  });

  it("clears the param (clean URL) when switching back to details", () => {
    mockParams("tab=comments");
    const { result } = renderHook(() => useUrlTabState());
    act(() => result.current[1]("details"));
    expect(window.location.search).toBe("");
  });
});
