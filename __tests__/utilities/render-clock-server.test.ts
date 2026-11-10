import {
  getRenderClock,
  quantizeRenderTime,
  RENDER_CLOCK_RESOLUTION_MS,
} from "@/utilities/render-clock-server";

/**
 * The render clock is serialized into every cached page. If it changes between
 * two regenerations that saw the same data, the page is stored again (an ISR
 * write) for no reader-visible reason — so it must only move on the hour.
 */

const HOUR = 60 * 60 * 1000;

describe("quantizeRenderTime", () => {
  it("rounds down to the hour", () => {
    expect(RENDER_CLOCK_RESOLUTION_MS).toBe(HOUR);
    expect(quantizeRenderTime(Date.parse("2026-11-10T14:59:59.999Z"))).toBe(
      Date.parse("2026-11-10T14:00:00.000Z")
    );
    expect(quantizeRenderTime(Date.parse("2026-11-10T15:00:00.000Z"))).toBe(
      Date.parse("2026-11-10T15:00:00.000Z")
    );
  });
});

describe("getRenderClock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the same value for every minute of an hour", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-11-10T14:01:12.345Z"));
    const early = await getRenderClock();
    vi.setSystemTime(Date.parse("2026-11-10T14:58:41.002Z"));
    const late = await getRenderClock();

    expect(early).toBe(Date.parse("2026-11-10T14:00:00.000Z"));
    expect(late).toBe(early);
  });

  it("moves once the hour turns", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-11-10T15:00:03.000Z"));

    expect(await getRenderClock()).toBe(Date.parse("2026-11-10T15:00:00.000Z"));
  });
});
