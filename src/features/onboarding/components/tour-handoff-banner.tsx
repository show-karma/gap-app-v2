"use client";

import { Compass } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@/src/components/navigation/Link";
import { TOUR_QUERY_PARAM, withTourParam } from "../lib/tour-query";
import type { TourDefinition } from "../lib/tours";

interface TourHandoffBannerProps {
  tour: TourDefinition;
  /** Where the walkthrough can actually run — omit while it's unknown. */
  destination: string | undefined;
  /** Name of the thing the walkthrough will open, for the link copy. */
  destinationLabel: string | undefined;
}

/**
 * Bridges a walkthrough request that landed on a list to the page that can run
 * it — the project walkthrough points at things inside a single project, but
 * the Getting started chooser can only link somewhere it knows exists.
 *
 * Deliberately a link the user presses rather than a redirect. Navigating for
 * them would pick a project on their behalf, and doing it from an effect
 * dispatches an App Router navigation that races the ones this route already
 * runs — the redirect was silently cancelled every time (see issue #1547).
 */
export function TourHandoffBanner({ tour, destination, destinationLabel }: TourHandoffBannerProps) {
  const [requested, setRequested] = useState(false);

  // Read on the client only: the parameter is a per-visit request, and reading
  // it during render would differ between server and client output.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URLSearchParams(window.location.search).get(TOUR_QUERY_PARAM);
    setRequested(param === tour.id);
  }, [tour.id]);

  if (!requested || !destination) return null;

  return (
    <div className="flex flex-row items-center gap-3 rounded-sf-card bg-sf-card p-4">
      <Compass className="h-5 w-5 shrink-0 text-sf-muted" />
      <p className="m-0 flex-1 text-[13px] text-sf-muted">
        The project walkthrough runs inside a project.
      </p>
      <Link
        href={withTourParam(destination, tour.id)}
        className="shrink-0 text-[13px] font-medium text-sf-heading underline underline-offset-2"
      >
        Start on {destinationLabel}
      </Link>
    </div>
  );
}
