import { captureWithContext } from "@/utilities/sentry-capture";
import { anchorSelector, findAnchor, type TourAnchor } from "./tour-anchors";
import type { TourDefinition } from "./tours";
// Loaded here rather than in the calling component so driver.js's stylesheet
// lands in this module's async chunk — the module itself is only imported once
// a tour actually runs.
import "../styles/tour.css";

export type TourOutcome =
  | { status: "completed" }
  | { status: "dismissed"; atStep: number }
  /** No step had a live anchor — nothing was shown. */
  | { status: "unavailable" };

export interface RunTourOptions {
  /**
   * Element to hand focus back to when the tour ends. Defaults to whatever had
   * focus when it started, which is right for a button press and harmless for
   * an automatic run.
   */
  returnFocusTo?: HTMLElement | null;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function reportMissingAnchors(tour: TourDefinition, missing: TourAnchor[]): void {
  captureWithContext(
    new Error(`Onboarding tour "${tour.id}" could not resolve ${missing.length} anchor(s)`),
    "onboarding-tour",
    "tour-anchor-missing",
    { tourId: tour.id, version: tour.version, missing }
  );
}

/**
 * Runs a tour, resolving with how it ended.
 *
 * Steps whose anchor isn't on the page are dropped rather than shown against
 * nothing, and the omission is reported — a tour quietly losing its steps
 * because an element was renamed is exactly the kind of silent degradation
 * that otherwise only surfaces when a user complains.
 */
export async function runTour(
  tour: TourDefinition,
  options: RunTourOptions = {}
): Promise<TourOutcome> {
  const present = tour.steps.filter((step) => findAnchor(step.anchor));
  const missing = tour.steps
    .filter((step) => !step.optional && !findAnchor(step.anchor))
    .map((step) => step.anchor);

  if (missing.length > 0) reportMissingAnchors(tour, missing);
  if (present.length === 0) return { status: "unavailable" };

  const { driver } = await import("driver.js");

  return new Promise<TourOutcome>((resolve) => {
    const returnFocusTo =
      options.returnFocusTo ??
      (typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null);

    let activeIndex = 0;
    // Set once the final step has been displayed. Someone who reaches the end
    // and then closes the popover has seen the whole thing, so that counts as
    // finishing rather than as a walk-away.
    let reachedLastStep = false;

    const instance = driver({
      animate: !prefersReducedMotion(),
      smoothScroll: true,
      allowClose: true,
      allowKeyboardControl: true,
      showProgress: present.length > 1,
      popoverClass: "karma-tour",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      steps: present.map((step) => ({
        element: anchorSelector(step.anchor),
        popover: { title: step.title, description: step.description },
      })),
      onPopoverRender: (popover) => {
        // driver.js renders the popover as a plain div; without this a screen
        // reader gets no signal that a dialog opened or what it's called.
        popover.wrapper.setAttribute("role", "dialog");
        popover.wrapper.setAttribute("aria-modal", "false");
        popover.wrapper.setAttribute("aria-live", "polite");
        if (!popover.title.id) popover.title.id = `karma-tour-${tour.id}-title`;
        popover.wrapper.setAttribute("aria-labelledby", popover.title.id);
        if (!popover.description.id) {
          popover.description.id = `karma-tour-${tour.id}-description`;
        }
        popover.wrapper.setAttribute("aria-describedby", popover.description.id);
        popover.closeButton.setAttribute("aria-label", "Close walkthrough");
      },
      onHighlighted: (_element, _step, opts) => {
        activeIndex = opts.driver.getActiveIndex() ?? activeIndex;
        if (opts.driver.isLastStep()) reachedLastStep = true;
      },
      onDestroyed: () => {
        returnFocusTo?.focus?.();
        resolve(
          reachedLastStep ? { status: "completed" } : { status: "dismissed", atStep: activeIndex }
        );
      },
    });

    instance.drive();
  });
}
