import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GETTING_STARTED_TOUR, surfaceFor } from "../../lib/tours";
import { useTour } from "../use-tour";

const runTour = vi.hoisted(() => vi.fn());
const analytics = vi.hoisted(() => ({
  trackTourStarted: vi.fn(),
  trackTourCompleted: vi.fn(),
  trackTourDismissed: vi.fn(),
}));
const storage = vi.hoisted(() => ({
  markCompleted: vi.fn(),
  markDismissed: vi.fn(),
  shouldAutoShow: vi.fn(),
}));
const scope = vi.hoisted(() => ({
  value: { scope: "did:privy:me", isReady: true, isAuthenticated: true },
}));
const whitelabel = vi.hoisted(() => ({ value: { isWhitelabel: false } }));

vi.mock("../../lib/run-tour", () => ({ runTour }));
vi.mock("../../lib/analytics", () => analytics);
vi.mock("../../lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/storage")>()),
  ...storage,
}));
vi.mock("../use-onboarding-scope", () => ({ useOnboardingScope: () => scope.value }));
vi.mock("@/utilities/whitelabel-context", () => ({ useWhitelabel: () => whitelabel.value }));

const SURFACE = surfaceFor(GETTING_STARTED_TOUR);

/** GETTING_STARTED_TOUR is desktop-only; jsdom reports no viewport by default. */
function setViewport(isDesktop: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: isDesktop }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  scope.value = { scope: "did:privy:me", isReady: true, isAuthenticated: true };
  whitelabel.value = { isWhitelabel: false };
  storage.shouldAutoShow.mockReturnValue(true);
  runTour.mockResolvedValue({ status: "completed" });
  setViewport(true);
});

describe("gating", () => {
  it("holds tours until auth has settled", async () => {
    scope.value = { scope: "anon", isReady: false, isAuthenticated: false };

    const { result } = renderHook(() => useTour());
    expect(result.current.canRunTours).toBe(false);
    await result.current.startTour(GETTING_STARTED_TOUR);

    expect(runTour).not.toHaveBeenCalled();
  });

  it("does not run tours on tenant deployments", async () => {
    whitelabel.value = { isWhitelabel: true };

    const { result } = renderHook(() => useTour());
    expect(result.current.canRunTours).toBe(false);
    await result.current.startTour(GETTING_STARTED_TOUR);

    expect(runTour).not.toHaveBeenCalled();
  });

  it("skips a desktop-only tour on a narrow viewport", async () => {
    setViewport(false);

    const { result } = renderHook(() => useTour());
    await result.current.startTour(GETTING_STARTED_TOUR);

    expect(runTour).not.toHaveBeenCalled();
  });

  it("skips an automatic run the user has already settled", async () => {
    storage.shouldAutoShow.mockReturnValue(false);

    const { result } = renderHook(() => useTour());
    await result.current.startTour(GETTING_STARTED_TOUR, { auto: true });

    expect(runTour).not.toHaveBeenCalled();
  });

  it("always honours an explicit request", async () => {
    storage.shouldAutoShow.mockReturnValue(false);

    const { result } = renderHook(() => useTour());
    await result.current.startTour(GETTING_STARTED_TOUR);

    expect(runTour).toHaveBeenCalledTimes(1);
  });

  it("refuses to stack a second tour on top of a running one", async () => {
    let release: (value: unknown) => void = () => {};
    runTour.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );

    const { result } = renderHook(() => useTour());
    const first = result.current.startTour(GETTING_STARTED_TOUR);
    await result.current.startTour(GETTING_STARTED_TOUR);

    expect(runTour).toHaveBeenCalledTimes(1);
    release({ status: "completed" });
    await first;
  });
});

describe("recording the outcome", () => {
  it("marks a finished tour complete and reports it", async () => {
    const { result } = renderHook(() => useTour());
    await result.current.startTour(GETTING_STARTED_TOUR);

    expect(storage.markCompleted).toHaveBeenCalledWith("did:privy:me", SURFACE);
    expect(analytics.trackTourStarted).toHaveBeenCalledWith(
      expect.objectContaining({ tour: GETTING_STARTED_TOUR.id, userId: "did:privy:me" })
    );
    expect(analytics.trackTourCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ steps: GETTING_STARTED_TOUR.steps.length })
    );
  });

  it("records where a walk-away happened", async () => {
    runTour.mockResolvedValue({ status: "dismissed", atStep: 2 });

    const { result } = renderHook(() => useTour());
    await result.current.startTour(GETTING_STARTED_TOUR);

    expect(storage.markDismissed).toHaveBeenCalledWith("did:privy:me", SURFACE);
    expect(analytics.trackTourDismissed).toHaveBeenCalledWith(
      expect.objectContaining({ atStep: 2 })
    );
  });

  it("persists nothing when no anchor was on the page", async () => {
    runTour.mockResolvedValue({ status: "unavailable" });

    const { result } = renderHook(() => useTour());
    await result.current.startTour(GETTING_STARTED_TOUR);

    expect(storage.markCompleted).not.toHaveBeenCalled();
    expect(storage.markDismissed).not.toHaveBeenCalled();
  });

  it("leaves the user id off events for a logged-out visitor", async () => {
    scope.value = { scope: "anon", isReady: true, isAuthenticated: false };

    const { result } = renderHook(() => useTour());
    await result.current.startTour(GETTING_STARTED_TOUR);

    expect(analytics.trackTourStarted).toHaveBeenCalledWith(
      expect.objectContaining({ userId: undefined })
    );
    expect(storage.markCompleted).toHaveBeenCalledWith("anon", SURFACE);
  });

  it("frees the lock so a later tour can run", async () => {
    const { result } = renderHook(() => useTour());
    await result.current.startTour(GETTING_STARTED_TOUR);
    await waitFor(() => expect(runTour).toHaveBeenCalledTimes(1));

    await result.current.startTour(GETTING_STARTED_TOUR);

    expect(runTour).toHaveBeenCalledTimes(2);
  });
});
