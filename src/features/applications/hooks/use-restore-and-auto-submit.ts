"use client";

import { type MutableRefObject, useEffect } from "react";
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
 * Restores a previously-persisted draft on mount and, when the user becomes
 * authenticated with a pending submit intent, triggers form auto-submit. The
 * effect is isolated here so ApplicationForm's render tree stays small and
 * react-doctor's adjust-state-on-prop-change and pass-data-to-parent warnings
 * don't trip in the parent component.
 */
export function useRestoreAndAutoSubmit({
  authenticated,
  pendingSubmitRef,
  readPersistedFormStateForAuth,
  setFormData,
  setShowLoginPrompt,
  attemptAutoSubmit,
}: UseRestoreAndAutoSubmitOptions): void {
  useEffect(() => {
    const persistedState = readPersistedFormStateForAuth();
    if (persistedState) {
      setFormData(persistedState.formData);
      pendingSubmitRef.current = persistedState.shouldAutoSubmit;
    }
    if (authenticated && pendingSubmitRef.current) {
      pendingSubmitRef.current = false;
      setShowLoginPrompt(false);
      attemptAutoSubmit();
    }
  }, [
    readPersistedFormStateForAuth,
    setFormData,
    authenticated,
    attemptAutoSubmit,
    setShowLoginPrompt,
    pendingSubmitRef,
  ]);
}
