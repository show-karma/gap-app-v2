"use client";

import type { ReactNode } from "react";
import { useServerFeedTakenOver } from "./serverFeedTakeover";

/**
 * Holds the server-rendered feed twin in the initial HTML until the interactive
 * feed takes over.
 *
 * A Client Component that reads no URL: that is the whole point. Its children
 * are rendered in the server tree, so they prerender into the HTML shell rather
 * than shipping as flight data under `UpdatesContent`'s `useSearchParams()`
 * abort.
 *
 * It renders its children plainly — never hidden, never `display: none`. Hiding
 * the twin at first paint would be the same crawlability loss wearing a
 * stylesheet.
 */
export function ServerFeedSlot({ children }: { children: ReactNode }) {
  const takenOver = useServerFeedTakenOver();

  if (takenOver) return null;
  return <>{children}</>;
}
