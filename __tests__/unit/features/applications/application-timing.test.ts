/**
 * @file Tests for the application form clock that feeds
 * `application_submitted.time_to_submit_s`.
 *
 * The important case is the negative one: a submit the page session never saw
 * start must report `null`, not a made-up duration measured from module load.
 */

import {
  __resetApplicationTimingForTests,
  markApplicationStarted,
  secondsSinceApplicationStarted,
} from "@/src/features/applications/lib/application-timing";

describe("application timing", () => {
  beforeEach(() => {
    __resetApplicationTimingForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports null for a program this page session never started", () => {
    expect(secondsSinceApplicationStarted("prog-1")).toBeNull();
  });

  it("measures whole seconds from the moment the form opened", () => {
    markApplicationStarted("prog-1");
    vi.advanceTimersByTime(95_000);

    expect(secondsSinceApplicationStarted("prog-1")).toBe(95);
  });

  it("keeps a separate clock per program", () => {
    markApplicationStarted("prog-1");
    vi.advanceTimersByTime(30_000);
    markApplicationStarted("prog-2");
    vi.advanceTimersByTime(10_000);

    expect(secondsSinceApplicationStarted("prog-1")).toBe(40);
    expect(secondsSinceApplicationStarted("prog-2")).toBe(10);
  });

  it("reports 0 rather than null for an instant submit", () => {
    markApplicationStarted("prog-1");

    expect(secondsSinceApplicationStarted("prog-1")).toBe(0);
  });

  it("restarts the clock when the same form is opened again", () => {
    markApplicationStarted("prog-1");
    vi.advanceTimersByTime(60_000);
    markApplicationStarted("prog-1");
    vi.advanceTimersByTime(5_000);

    expect(secondsSinceApplicationStarted("prog-1")).toBe(5);
  });
});
