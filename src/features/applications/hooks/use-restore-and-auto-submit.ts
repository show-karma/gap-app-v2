"use client";

import { type MutableRefObject, useEffect, useRef } from "react";
import type { ApplicationFormData } from "../types";

interface PersistedState {
  formData: ApplicationFormData;
  shouldAutoSubmit: boolean;
}

interface UseRestoreAndAutoSubmitOptions {
  authenticated: boolean;
  pendingSubmitRef: MutableRefObject<boolean>;
  readPersistedFormStateForAuth: () => PersistedState | null;
  setFormData: (data: ApplicationFormData) => void;
  setShowLoginPrompt: (open: boolean) => void;
  attemptAutoSubmit: () => void;
}

/**
 * Restores a previously-persisted draft on mount, then independently triggers
 * auto-submit when the user becomes authenticated with a pending submit intent.
 * The two effects are intentionally split so that subsequent `authenticated`
 * transitions (e.g. wallet/provider reconnect) do NOT re-read sessionStorage
 * and clobber the user's current edits with the now-stale persisted draft.
 */
export function useRestoreAndAutoSubmit({
  authenticated,
  pendingSubmitRef,
  readPersistedFormStateForAuth,
  setFormData,
  setShowLoginPrompt,
  attemptAutoSubmit,
}: UseRestoreAndAutoSubmitOptions): void {
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const persistedState = readPersistedFormStateForAuth();
    if (!persistedState) return;
    setFormData(persistedState.formData);
    pendingSubmitRef.current = persistedState.shouldAutoSubmit;
  }, [readPersistedFormStateForAuth, setFormData, pendingSubmitRef]);

  useEffect(() => {
    if (authenticated && pendingSubmitRef.current) {
      pendingSubmitRef.current = false;
      setShowLoginPrompt(false);
      attemptAutoSubmit();
    }
  }, [authenticated, pendingSubmitRef, setShowLoginPrompt, attemptAutoSubmit]);
}
