/**
 * Anchors are a declared contract between a tour and the UI it points at.
 *
 * Tours resolve their target by selector, and a selector that misses fails
 * silently — a spotlight over the wrong element, or a dimmed page highlighting
 * nothing. Anchoring on `data-tour` rather than classes or DOM shape keeps that
 * dependency greppable: the attribute shows up in a diff, so removing or
 * renaming the element is visibly a change to something onboarding depends on.
 */

export const TOUR_ANCHORS = {
  /** Profile menu trigger — where "Getting started" lives. */
  gettingStarted: "getting-started",
  findFundersSearch: "find-funders-search",
  findFundersResults: "find-funders-results",
  findFundersTray: "find-funders-tray",
  reviewerInboxQueue: "reviewer-inbox-queue",
  reviewerInboxScope: "reviewer-inbox-scope",
  projectGrants: "project-grants",
  projectUpdates: "project-updates",
} as const;

export type TourAnchor = (typeof TOUR_ANCHORS)[keyof typeof TOUR_ANCHORS];

/** Spread onto the element a tour step points at: `<div {...dataTour(...)}>`. */
export function dataTour(anchor: TourAnchor): { "data-tour": TourAnchor } {
  return { "data-tour": anchor };
}

export function anchorSelector(anchor: TourAnchor): string {
  return `[data-tour="${anchor}"]`;
}

export function findAnchor(anchor: TourAnchor): Element | null {
  if (typeof document === "undefined") return null;
  return document.querySelector(anchorSelector(anchor));
}
