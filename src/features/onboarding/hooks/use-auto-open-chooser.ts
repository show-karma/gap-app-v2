"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGettingStarted } from "@/store/modals/gettingStarted";
import { useWhitelabel } from "@/utilities/whitelabel-context";
import { markCompleted, readOnboardingRecord, writeOnboardingCleared } from "../lib/storage";
import { useOnboardingScope } from "./use-onboarding-scope";

/** Storage surface holding the user's "stop offering this" answer. */
export const CHOOSER_SURFACE = "chooser:auto-open";

/**
 * Session guard. The chooser opens once per browser session rather than on
 * every render, so refreshing or moving between pages mid-session doesn't
 * reopen it — only signing in again does.
 */
const SESSION_KEY_PREFIX = "karma:onboarding:chooser-opened";

/** Per identity, so a second account signing in on the same tab still gets it. */
function sessionKey(scope: string): string {
  return `${SESSION_KEY_PREFIX}:${scope}`;
}

/**
 * Whether the chooser has already been offered this session. The coach mark
 * says the same thing in a smaller voice, so it stands down when the chooser
 * has spoken — otherwise both land on screen at once.
 */
export function chooserShownThisSession(scope: string): boolean {
  return openedThisSession(scope);
}

function openedThisSession(scope: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(sessionKey(scope)) === "1";
  } catch {
    // SUPPRESSED: sessionStorage throws in private browsing. Treating it as
    // "already opened" errs toward not interrupting someone repeatedly.
    return true;
  }
}

function markOpenedThisSession(scope: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(sessionKey(scope), "1");
  } catch {
    // SUPPRESSED: as above — worst case it offers itself once more.
  }
}

/** Whether the user has asked not to be shown the chooser on sign-in again. */
export function isChooserSuppressed(scope: string): boolean {
  return readOnboardingRecord(scope, CHOOSER_SURFACE)?.outcome === "completed";
}

/**
 * Opens the Getting started chooser once per session for a signed-in user.
 *
 * Suppression is a deliberate answer, never inferred: closing the dialog is not
 * treated as "stop showing me this", because someone dismissing a thing they
 * didn't ask for is not the same as someone opting out of it.
 */
export function useAutoOpenChooser(): void {
  const { scope, isReady, isAuthenticated } = useOnboardingScope();
  const { isWhitelabel } = useWhitelabel();
  const open = useGettingStarted((state) => state.open);
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current || !isReady || !isAuthenticated || isWhitelabel) return;
    if (openedThisSession(scope) || isChooserSuppressed(scope)) return;

    hasFired.current = true;
    markOpenedThisSession(scope);
    open();
  }, [isReady, isAuthenticated, isWhitelabel, scope, open]);
}

/** Reads and writes the "don't show this again" answer for the current user. */
export function useChooserSuppression(): {
  suppressed: boolean;
  setSuppressed: (next: boolean) => void;
} {
  const { scope, isReady } = useOnboardingScope();
  const [suppressed, setLocal] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    setLocal(isChooserSuppressed(scope));
  }, [isReady, scope]);

  const setSuppressed = useCallback(
    (next: boolean) => {
      setLocal(next);
      if (next) markCompleted(scope, CHOOSER_SURFACE);
      else writeOnboardingCleared(scope, CHOOSER_SURFACE);
    },
    [scope]
  );

  return { suppressed, setSuppressed };
}
