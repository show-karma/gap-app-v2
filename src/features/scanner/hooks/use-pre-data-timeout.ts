"use client";

import { useEffect, useState } from "react";

const GIVE_UP_MS = 45_000;

// Wall-clock cap for the pre-data "generating" state. The query hooks cap by
// attempt count, but each attempt's duration stretches with upstream latency,
// so a slow proxy can keep the fake progress on screen far past the intended
// window. After GIVE_UP_MS without a payload we stop pretending progress and
// let the caller surface its error UI instead.
export function usePreDataTimeout(pending: boolean): boolean {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!pending) return;
    setTimedOut(false);
    const timer = setTimeout(() => setTimedOut(true), GIVE_UP_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  return pending && timedOut;
}
