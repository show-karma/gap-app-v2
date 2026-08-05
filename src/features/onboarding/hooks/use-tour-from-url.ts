"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { stripTourParam, TOUR_QUERY_PARAM } from "../lib/tour-query";
import type { TourDefinition } from "../lib/tours";
import { useTour } from "./use-tour";

/**
 * Starts `tour` when the page was opened with `?tour=<its id>` — the link the
 * profile-menu chooser builds when the requested walkthrough lives on a
 * different page than the one the user is on.
 *
 * `ready` lets the surface hold the request until the elements the tour points
 * at are actually rendered; on find-funders, for instance, two of the three
 * anchors don't exist until a search has returned.
 */
export function useTourFromUrl(tour: TourDefinition, ready = true): void {
  const searchParams = useSearchParams();
  const requested = searchParams.get(TOUR_QUERY_PARAM);
  const { startTour, canRunTours } = useTour();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current || !ready || !canRunTours) return;
    if (requested !== tour.id) return;
    hasStarted.current = true;
    stripTourParam();
    // Explicitly requested, so it runs regardless of whether it has been seen.
    void startTour(tour);
  }, [requested, ready, canRunTours, startTour, tour]);
}
