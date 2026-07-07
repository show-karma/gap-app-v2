"use client";

import { AlertCircle } from "lucide-react";
import type { GeographyDiagnostic } from "@/types/donor-research";

interface GeographyWarningProps {
  diagnostic: GeographyDiagnostic | null;
}

/**
 * Surfaces a banner when the LLM couldn't confidently interpret the
 * advisor's geography input. Three triggers:
 *
 *  1. `confidence < 0.5` — LLM was uncertain
 *  2. `radius === "unknown"` — couldn't parse at all
 *  3. User typed something AND resolvedStates is empty AND radius is
 *     not 'national' — input was non-empty but no filter was applied
 *
 * Renders nothing when there's no diagnostic or no warning condition.
 * The advisor sees this only when there's a real problem with the
 * geography filter; otherwise stays out of the way.
 */
export function GeographyWarning({ diagnostic }: GeographyWarningProps) {
  if (!diagnostic) return null;

  const input = diagnostic.inputGeography?.trim() ?? "";
  if (input.length === 0) return null; // user didn't specify geography
  if (diagnostic.radius === "national") return null; // intentional

  const lowConfidence = diagnostic.confidence < 0.5;
  const unknownRadius = diagnostic.radius === "unknown";
  const emptyStates = diagnostic.resolvedStates.length === 0;

  if (!lowConfidence && !unknownRadius && !emptyStates) return null;

  return (
    <output className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm dark:border-amber-700/60 dark:bg-amber-950/40">
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
        aria-hidden
      />
      <div className="flex-1 text-amber-900 dark:text-amber-100">
        <p className="font-medium">
          {unknownRadius || emptyStates
            ? `We couldn't interpret "${input}" as a US locale.`
            : `The geography filter may not match what you intended.`}
        </p>
        <p className="mt-0.5 text-amber-800 dark:text-amber-200">
          {emptyStates || unknownRadius
            ? 'Results aren\'t filtered by state — try a US city, state, or region (e.g., "San Francisco", "Texas", "Pacific Northwest").'
            : `We mapped this to ${describeResolution(diagnostic)}. If that's wrong, try a more specific input.`}
        </p>
      </div>
    </output>
  );
}

function describeResolution(d: GeographyDiagnostic): string {
  if (d.resolvedCities.length > 0) {
    const sample = d.resolvedCities.slice(0, 3).join(", ");
    const more = d.resolvedCities.length > 3 ? `, +${d.resolvedCities.length - 3} more` : "";
    return `${sample}${more} (${d.resolvedStates.join(", ")})`;
  }
  if (d.resolvedStates.length > 0) {
    return d.resolvedStates.join(", ");
  }
  return "an unrecognized locale";
}
