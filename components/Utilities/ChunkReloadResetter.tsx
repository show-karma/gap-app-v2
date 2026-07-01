"use client";

import { useEffect } from "react";
import { clearChunkReloadFlag } from "@/utilities/isChunkLoadError";

/**
 * Clears the one-time chunk-reload guard once the app has successfully mounted.
 *
 * When a stale-deploy `ChunkLoadError` triggers a hard reload, a sessionStorage
 * flag is set to prevent an infinite loop. If the reload succeeds and the app
 * mounts, the next deploy must be able to recover again — so we clear the flag
 * here. Reaching this mount means the new build's chunks loaded fine.
 */
export function ChunkReloadResetter(): null {
  useEffect(() => {
    clearChunkReloadFlag();
  }, []);

  return null;
}
