"use client";

import { useCallback, useEffect, useState } from "react";

import { clearCommenterIdentity } from "@/services/donor-research-comments.service";

const COOKIE_NAME = "drsc_name";

function readNameCookie(): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export interface CommenterIdentity {
  /** Display name from the JS-readable cookie, null when not present. */
  displayName: string | null;
  /** True when the viewer is the advisor (Privy-authenticated as report owner). */
  isAdvisor: boolean;
  /** True when displayName OR isAdvisor is true. */
  hasIdentity: boolean;
  /** Forces a re-read of the cookie (call after a mutation that may have Set-Cookie'd a new name). */
  refresh: () => void;
  /** "Not me — switch" affordance — clears cookies then refreshes. */
  clearIdentity: () => Promise<void>;
}

/**
 * Reads the `drsc_name` cookie on the FE origin and exposes the
 * "Commenting as X" affordance plus a clear action (Q2). The advisor
 * flag is plumbed in from the parent (the SharedReportView knows
 * whether the Privy session matches the report's advisor_id).
 */
export function useCommenterIdentity(
  token: string,
  isAdvisor: boolean,
): CommenterIdentity {
  const [displayName, setDisplayName] = useState<string | null>(() =>
    readNameCookie(),
  );

  const refresh = useCallback(() => {
    setDisplayName(readNameCookie());
  }, []);

  const clearIdentity = useCallback(async () => {
    await clearCommenterIdentity(token);
    setDisplayName(null);
  }, [token]);

  // Re-read on mount so server-rendered pages pick up an existing cookie.
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    displayName,
    isAdvisor,
    hasIdentity: isAdvisor || displayName !== null,
    refresh,
    clearIdentity,
  };
}
