import { describe, expect, it } from "vitest";
import { withRequestTimeout } from "@/utilities/requestTimeout";

/**
 * A hung request neither resolves nor rejects, so React Query stays `fetching`
 * forever with no data and no error — the feed then sits on a skeleton with
 * nothing to retry. QA reproduced exactly that against a real project (20+
 * seconds, no status code, no console error). This helper is what converts the
 * hang into an ordinary abort so the error path can run.
 *
 * Real timers with tiny durations: `AbortSignal.timeout` is a platform API and
 * does not honour fake timers.
 */
describe("withRequestTimeout", () => {
  it("aborts once the timeout elapses, even if nothing else ever settles", async () => {
    const signal = withRequestTimeout(undefined, 20);

    expect(signal.aborted).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(signal.aborted).toBe(true);
  });

  it("aborts when the caller's signal aborts, before the timeout", async () => {
    const controller = new AbortController();
    const signal = withRequestTimeout(controller.signal, 10_000);

    expect(signal.aborted).toBe(false);
    controller.abort();
    await new Promise((r) => setTimeout(r, 10));
    expect(signal.aborted).toBe(true);
  });

  it("is already aborted when the caller's signal was aborted up front", () => {
    const controller = new AbortController();
    controller.abort();

    expect(withRequestTimeout(controller.signal, 10_000).aborted).toBe(true);
  });

  it("returns a timeout-only signal when the caller has none", async () => {
    const signal = withRequestTimeout(undefined, 20);
    await new Promise((r) => setTimeout(r, 60));
    expect(signal.aborted).toBe(true);
  });
});
