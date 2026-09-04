import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { RenderClockProvider, useRenderedAt, useRenderNow } from "@/utilities/render-clock-context";

/**
 * The render clock is how a Client Component reads "now" on a Cache-class
 * route without touching the clock during render — the read that aborts a
 * cacheComponents prerender. These tests pin the two halves of that contract:
 * the server value is what renders, and the live clock takes over after mount.
 */

const RENDERED_AT = Date.parse("2026-09-01T12:00:00.000Z");
const LIVE_NOW = Date.parse("2026-09-03T09:30:00.000Z");

const withProvider = ({ children }: { children: ReactNode }) => (
  <RenderClockProvider renderedAt={RENDERED_AT}>{children}</RenderClockProvider>
);

describe("useRenderNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(LIVE_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the provider's clock on the server, never the wall clock", () => {
    const dateSpy = vi.spyOn(Date, "now");

    function Deadline() {
      const now = useRenderNow();
      return <time dateTime={now.toISOString()}>{now.toISOString()}</time>;
    }

    const html = renderToString(
      <RenderClockProvider renderedAt={RENDERED_AT}>
        <Deadline />
      </RenderClockProvider>
    );

    expect(html).toContain("2026-09-01T12:00:00.000Z");
    expect(html).not.toContain("2026-09-03");
    expect(dateSpy).not.toHaveBeenCalled();
  });

  it("hydrates with the provider's clock, then upgrades to the live clock after mount", async () => {
    const seen: number[] = [];
    const { result } = renderHook(
      () => {
        const now = useRenderNow();
        seen.push(now.getTime());
        return now;
      },
      { wrapper: withProvider }
    );

    // The first client render must match the server HTML…
    expect(seen[0]).toBe(RENDERED_AT);
    // …and is replaced once the mount effect runs.
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(result.current.getTime()).toBe(LIVE_NOW);
  });

  it("falls back to the wall clock when no provider is mounted", () => {
    const { result } = renderHook(() => useRenderNow());

    expect(result.current.getTime()).toBe(LIVE_NOW);
  });
});

describe("useRenderedAt", () => {
  it("returns the provider's value and keeps it stable across renders", () => {
    const { result, rerender } = renderHook(() => useRenderedAt(), { wrapper: withProvider });

    expect(result.current).toBe(RENDERED_AT);
    rerender();
    expect(result.current).toBe(RENDERED_AT);
  });
});
