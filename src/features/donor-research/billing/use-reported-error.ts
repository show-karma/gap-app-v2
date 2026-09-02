"use client";

import { useEffect, useRef } from "react";
import { errorManager } from "@/components/Utilities/errorManager";

/**
 * Reports a billing failure to Sentry so the UI can render FIXED copy without
 * losing the diagnosis.
 *
 * The billing service copies the backend's own `message` into the thrown error
 * (a 402 body names a dimension, a 500 may name a good deal more), so rendering
 * `error.message` hands server-side detail to whoever is looking at the screen
 * — CWE-209. The message goes here instead, and the user gets copy we wrote.
 *
 * Keyed on error IDENTITY: React Query hands back the same error object across
 * re-renders, so a re-render must not re-report it.
 */
export function useReportedError(context: string, error: unknown): void {
  const reported = useRef<unknown>(null);

  useEffect(() => {
    if (!error || reported.current === error) return;
    reported.current = error;
    errorManager(context, error);
  }, [context, error]);
}
