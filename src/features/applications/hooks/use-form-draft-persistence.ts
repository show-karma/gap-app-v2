"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { captureWithContext } from "@/utilities/sentry-capture";
import type { ApplicationFormData } from "../types";

const COMPONENT_TAG = "useFormDraftPersistence";

const FORM_AUTH_PERSISTENCE_KEY_PREFIX = "gap:application-form-auth";
const FORM_AUTH_PERSISTENCE_TTL_MS = 30 * 60 * 1000;
const DRAFT_SAVE_DEBOUNCE_MS = 300;

interface PendingFormAuthState {
  formData: ApplicationFormData;
  shouldAutoSubmit: boolean;
  createdAt: number;
}

type DraftStorageOperation = "read" | "write" | "remove" | "parse";
type PendingDraft = { kind: "persist"; formData: ApplicationFormData } | { kind: "clear" };

type WatchSubscription = (callback: (value: Partial<ApplicationFormData>) => void) => {
  unsubscribe: () => void;
};

function getFormAuthPersistenceKey(programId: string, formId?: string): string {
  return `${FORM_AUTH_PERSISTENCE_KEY_PREFIX}:${programId}:${formId ?? "default"}`;
}

function hasMeaningfulFormValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasMeaningfulFormValue);
  }
  return true;
}

function hasMeaningfulFormData(data: Partial<ApplicationFormData>): boolean {
  return Object.values(data).some(hasMeaningfulFormValue);
}

interface UseFormDraftPersistenceOptions {
  programId: string;
  formId?: string;
  watch: WatchSubscription;
  authenticated: boolean;
  onDataChange?: (data: Partial<ApplicationFormData>) => void;
}

interface FormDraftPersistence {
  pendingSubmitRef: React.MutableRefObject<boolean>;
  persistFormStateForAuth: (formData: ApplicationFormData, shouldAutoSubmit: boolean) => void;
  clearPersistedFormStateForAuth: () => void;
  readPersistedFormStateForAuth: () => PendingFormAuthState | null;
}

/**
 * Owns the full draft-persistence lifecycle for a single application form:
 * subscribes to RHF's `watch`, debounces writes to sessionStorage while the
 * applicant is unauthenticated, flushes pending writes on unmount, and
 * exposes imperative persist/clear/read helpers for the login + submit paths.
 */
export function useFormDraftPersistence({
  programId,
  formId,
  watch,
  authenticated,
  onDataChange,
}: UseFormDraftPersistenceOptions): FormDraftPersistence {
  const pendingSubmitRef = useRef(false);
  const draftPersistenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraftPersistenceRef = useRef<PendingDraft | null>(null);
  const hasShownDraftStorageWarningRef = useRef(false);

  // Stash callbacks in refs so the watch effect can run with stable deps —
  // otherwise an unstable `onDataChange` identity from the parent would
  // re-subscribe on every render and lose pending debounced writes.
  const onDataChangeRef = useRef(onDataChange);
  const authenticatedRef = useRef(authenticated);
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
    authenticatedRef.current = authenticated;
  }, [onDataChange, authenticated]);

  const authPersistenceKey = useMemo(
    () => getFormAuthPersistenceKey(programId, formId),
    [programId, formId]
  );

  const handleDraftStorageError = useCallback(
    (error: unknown, operation: DraftStorageOperation) => {
      captureWithContext(error, COMPONENT_TAG, "application-form-draft-storage-failed", {
        operation,
        programId,
        formId: formId ?? "default",
      });
      if (!hasShownDraftStorageWarningRef.current) {
        hasShownDraftStorageWarningRef.current = true;
        toast.error("We couldn't save your draft in this browser. Please submit before leaving.");
      }
    },
    [formId, programId]
  );

  const persistFormStateForAuth = useCallback(
    (formData: ApplicationFormData, shouldAutoSubmit: boolean) => {
      if (typeof window === "undefined") return;
      try {
        const payload: PendingFormAuthState = {
          formData,
          shouldAutoSubmit,
          createdAt: Date.now(),
        };
        window.sessionStorage.setItem(authPersistenceKey, JSON.stringify(payload));
      } catch (error) {
        handleDraftStorageError(error, "write");
      }
    },
    [authPersistenceKey, handleDraftStorageError]
  );

  const clearPersistedFormStateForAuth = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(authPersistenceKey);
    } catch (error) {
      handleDraftStorageError(error, "remove");
    }
  }, [authPersistenceKey, handleDraftStorageError]);

  const flushPendingDraftPersistence = useCallback(() => {
    if (draftPersistenceTimeoutRef.current) {
      clearTimeout(draftPersistenceTimeoutRef.current);
      draftPersistenceTimeoutRef.current = null;
    }
    const pending = pendingDraftPersistenceRef.current;
    if (!pending) return;
    pendingDraftPersistenceRef.current = null;
    if (pending.kind === "clear") {
      clearPersistedFormStateForAuth();
      return;
    }
    persistFormStateForAuth(pending.formData, pendingSubmitRef.current);
  }, [clearPersistedFormStateForAuth, persistFormStateForAuth]);

  const readPersistedFormStateForAuth = useCallback((): PendingFormAuthState | null => {
    if (typeof window === "undefined") return null;
    let raw: string | null;
    try {
      raw = window.sessionStorage.getItem(authPersistenceKey);
    } catch (error) {
      handleDraftStorageError(error, "read");
      return null;
    }
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as PendingFormAuthState;
      // sessionStorage is user-writeable, so the payload could be tampered or
      // belong to an older schema. Validate every field's shape before handing
      // the value back to the form's restore path.
      const formData = parsed?.formData;
      const isPlainFormData =
        typeof formData === "object" && formData !== null && !Array.isArray(formData);
      const isShouldAutoSubmitValid = typeof parsed?.shouldAutoSubmit === "boolean";
      const isCreatedAtValid =
        typeof parsed?.createdAt === "number" && Number.isFinite(parsed.createdAt);
      const isFresh =
        isCreatedAtValid && Date.now() - parsed.createdAt <= FORM_AUTH_PERSISTENCE_TTL_MS;
      if (!isPlainFormData || !isShouldAutoSubmitValid || !isCreatedAtValid || !isFresh) {
        clearPersistedFormStateForAuth();
        return null;
      }
      return parsed;
    } catch (error) {
      handleDraftStorageError(error, "parse");
      clearPersistedFormStateForAuth();
      return null;
    }
  }, [authPersistenceKey, clearPersistedFormStateForAuth, handleDraftStorageError]);

  const schedulePersistOrClear = useCallback(
    (data: Partial<ApplicationFormData>) => {
      if (draftPersistenceTimeoutRef.current) {
        clearTimeout(draftPersistenceTimeoutRef.current);
        draftPersistenceTimeoutRef.current = null;
      }

      if (hasMeaningfulFormData(data) || pendingSubmitRef.current) {
        pendingDraftPersistenceRef.current = {
          kind: "persist",
          formData: data as ApplicationFormData,
        };
      } else {
        pendingDraftPersistenceRef.current = { kind: "clear" };
      }

      draftPersistenceTimeoutRef.current = setTimeout(() => {
        flushPendingDraftPersistence();
      }, DRAFT_SAVE_DEBOUNCE_MS);
    },
    [flushPendingDraftPersistence]
  );

  useEffect(() => {
    const { unsubscribe } = watch((value) => {
      const currentFormData = value as Partial<ApplicationFormData>;
      onDataChangeRef.current?.(currentFormData);
      if (authenticatedRef.current) return;
      schedulePersistOrClear(currentFormData);
    });
    return () => {
      flushPendingDraftPersistence();
      unsubscribe();
    };
  }, [watch, schedulePersistOrClear, flushPendingDraftPersistence]);

  return {
    pendingSubmitRef,
    persistFormStateForAuth,
    clearPersistedFormStateForAuth,
    readPersistedFormStateForAuth,
  };
}
