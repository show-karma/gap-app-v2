"use client";

import { Compass } from "lucide-react";
import { useGettingStarted } from "@/store/modals/gettingStarted";
import { useAutoTour } from "../hooks/use-tour";
import { GETTING_STARTED_TOUR } from "../lib/tours";

interface GettingStartedSignpostProps {
  /**
   * True once the user has something on their dashboard. The signpost waits for
   * that: at sign-in it would compete with whatever they came to do, and it
   * points at a way to get *back* to onboarding — which only means something
   * once there is somewhere to get back to.
   */
  ready: boolean;
}

/**
 * Points people at the always-available way back into onboarding.
 *
 * On desktop that's a one-step spotlight on the profile menu. Below `lg` the
 * profile menu lives inside a collapsed sheet with nothing to anchor to, so the
 * same thing is said in a line of text instead — one sentence rather than a
 * second, mobile-specific overlay path to maintain.
 */
export function GettingStartedSignpost({ ready }: GettingStartedSignpostProps) {
  const { open } = useGettingStarted();
  useAutoTour(GETTING_STARTED_TOUR, ready);

  return (
    <p className="m-0 flex flex-row items-center gap-2 text-[12.5px] text-sf-muted lg:hidden">
      <Compass className="h-4 w-4 shrink-0" />
      <span>
        Need a walkthrough later?{" "}
        <button
          type="button"
          onClick={open}
          className="underline underline-offset-2 hover:text-sf-heading"
        >
          Getting started
        </button>{" "}
        is in your profile menu.
      </span>
    </p>
  );
}
