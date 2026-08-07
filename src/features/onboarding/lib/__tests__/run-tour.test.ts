import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runTour } from "../run-tour";
import { TOUR_ANCHORS } from "../tour-anchors";
import type { TourDefinition } from "../tours";

const captureWithContext = vi.hoisted(() => vi.fn());
const driverFactory = vi.hoisted(() => vi.fn());

vi.mock("@/utilities/sentry-capture", () => ({ captureWithContext }));
vi.mock("driver.js", () => ({ driver: driverFactory }));
vi.mock("../../styles/tour.css", () => ({}));

const TOUR: TourDefinition = {
  id: "test-tour",
  version: 3,
  steps: [
    { anchor: TOUR_ANCHORS.findFundersSearch, title: "One", description: "First" },
    { anchor: TOUR_ANCHORS.findFundersResults, title: "Two", description: "Second" },
  ],
};

/** Captures the config driver.js was built with, and drives the tour to an end. */
function stubDriver({ reachLastStep }: { reachLastStep: boolean }) {
  driverFactory.mockImplementation((config) => {
    const instance = {
      drive: () => {
        const lastIndex = (config.steps?.length ?? 1) - 1;
        const index = reachLastStep ? lastIndex : 0;
        config.onHighlighted?.(undefined, config.steps[index], {
          config,
          state: {},
          driver: {
            getActiveIndex: () => index,
            isLastStep: () => index === lastIndex,
          },
        });
        config.onDestroyed?.(undefined, config.steps[index], {
          config,
          state: {},
          driver: instance,
        });
      },
    };
    return instance;
  });
}

function mountAnchor(anchor: string) {
  const el = document.createElement("div");
  el.setAttribute("data-tour", anchor);
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
  captureWithContext.mockClear();
  driverFactory.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("missing anchors", () => {
  it("returns unavailable and reports when no anchor is on the page", async () => {
    stubDriver({ reachLastStep: true });

    const outcome = await runTour(TOUR);

    expect(outcome).toEqual({ status: "unavailable" });
    expect(driverFactory).not.toHaveBeenCalled();
    expect(captureWithContext).toHaveBeenCalledWith(
      expect.any(Error),
      "onboarding-tour",
      "tour-anchor-missing",
      expect.objectContaining({
        tourId: "test-tour",
        version: 3,
        missing: [TOUR_ANCHORS.findFundersSearch, TOUR_ANCHORS.findFundersResults],
      })
    );
  });

  it("runs the steps it can resolve and reports only the ones it cannot", async () => {
    mountAnchor(TOUR_ANCHORS.findFundersSearch);
    stubDriver({ reachLastStep: true });

    const outcome = await runTour(TOUR);

    expect(outcome.status).toBe("completed");
    expect(driverFactory.mock.calls[0][0].steps).toHaveLength(1);
    expect(captureWithContext).toHaveBeenCalledWith(
      expect.any(Error),
      "onboarding-tour",
      "tour-anchor-missing",
      expect.objectContaining({ missing: [TOUR_ANCHORS.findFundersResults] })
    );
  });

  it("drops an optional step quietly when its anchor is absent", async () => {
    mountAnchor(TOUR_ANCHORS.findFundersSearch);
    stubDriver({ reachLastStep: true });
    const withOptional: TourDefinition = {
      ...TOUR,
      steps: [TOUR.steps[0], { ...TOUR.steps[1], optional: true }],
    };

    const outcome = await runTour(withOptional);

    expect(outcome.status).toBe("completed");
    expect(driverFactory.mock.calls[0][0].steps).toHaveLength(1);
    expect(captureWithContext).not.toHaveBeenCalled();
  });

  it("does not report when every anchor resolves", async () => {
    mountAnchor(TOUR_ANCHORS.findFundersSearch);
    mountAnchor(TOUR_ANCHORS.findFundersResults);
    stubDriver({ reachLastStep: true });

    await runTour(TOUR);

    expect(captureWithContext).not.toHaveBeenCalled();
  });
});

describe("outcomes", () => {
  beforeEach(() => {
    mountAnchor(TOUR_ANCHORS.findFundersSearch);
    mountAnchor(TOUR_ANCHORS.findFundersResults);
  });

  it("counts reaching the final step as completed", async () => {
    stubDriver({ reachLastStep: true });

    await expect(runTour(TOUR)).resolves.toEqual({ status: "completed", stepsShown: 2 });
  });

  it("records where someone walked away", async () => {
    stubDriver({ reachLastStep: false });

    await expect(runTour(TOUR)).resolves.toEqual({
      status: "dismissed",
      atStep: 0,
      stepsShown: 2,
    });
  });

  it("returns focus to the control that opened it", async () => {
    stubDriver({ reachLastStep: true });
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    const focus = vi.spyOn(trigger, "focus");

    await runTour(TOUR, { returnFocusTo: trigger });

    expect(focus).toHaveBeenCalled();
  });
});

describe("motion preference", () => {
  beforeEach(() => {
    mountAnchor(TOUR_ANCHORS.findFundersSearch);
    mountAnchor(TOUR_ANCHORS.findFundersResults);
    stubDriver({ reachLastStep: true });
  });

  it("animates by default", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));

    await runTour(TOUR);

    expect(driverFactory.mock.calls[0][0].animate).toBe(true);
  });

  it("stops animating when the user asks for reduced motion", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    await runTour(TOUR);

    expect(driverFactory.mock.calls[0][0].animate).toBe(false);
  });
});

describe("accessibility wiring", () => {
  it("labels the popover as a dialog and names its close control", async () => {
    mountAnchor(TOUR_ANCHORS.findFundersSearch);
    stubDriver({ reachLastStep: true });

    await runTour(TOUR);

    const popover = {
      wrapper: document.createElement("div"),
      title: document.createElement("h1"),
      description: document.createElement("p"),
      closeButton: document.createElement("button"),
    };
    driverFactory.mock.calls[0][0].onPopoverRender?.(popover);

    expect(popover.wrapper.getAttribute("role")).toBe("dialog");
    expect(popover.wrapper.getAttribute("aria-labelledby")).toBe(popover.title.id);
    expect(popover.wrapper.getAttribute("aria-describedby")).toBe(popover.description.id);
    expect(popover.closeButton.getAttribute("aria-label")).toBe("Close walkthrough");
  });
});
