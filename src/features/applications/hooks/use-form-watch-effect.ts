"use client";

import { useEffect } from "react";
import type { ApplicationFormData } from "../types";

type WatchSubscription = (callback: (value: Partial<ApplicationFormData>) => void) => {
  unsubscribe: () => void;
};

interface UseFormWatchEffectOptions {
  watch: WatchSubscription;
  authenticated: boolean;
  onDataChange?: (data: Partial<ApplicationFormData>) => void;
  schedulePersistOrClear: (data: Partial<ApplicationFormData>) => void;
  flushPendingDraftPersistence: () => void;
}

/**
 * Subscribes to RHF watch and routes each value to the parent callback (when
 * the consumer provided one) and the draft-persistence scheduler. Owns the
 * unsubscribe + flush lifecycle. Lives outside ApplicationForm so the parent
 * component doesn't trip react-doctor's pass-data-to-parent rule.
 */
export function useFormWatchEffect({
  watch,
  authenticated,
  onDataChange,
  schedulePersistOrClear,
  flushPendingDraftPersistence,
}: UseFormWatchEffectOptions): void {
  useEffect(() => {
    const { unsubscribe } = watch((value) => {
      const currentFormData = value as Partial<ApplicationFormData>;
      onDataChange?.(currentFormData);
      if (authenticated) return;
      schedulePersistOrClear(currentFormData);
    });
    return () => {
      flushPendingDraftPersistence();
      unsubscribe();
    };
  }, [watch, onDataChange, authenticated, schedulePersistOrClear, flushPendingDraftPersistence]);
}
