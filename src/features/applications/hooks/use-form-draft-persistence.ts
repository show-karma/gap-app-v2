"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import type { ApplicationFormData } from "../types";

const FORM_AUTH_PERSISTENCE_KEY_PREFIX = "gap:application-form-auth";
const FORM_AUTH_PERSISTENCE_TTL_MS = 30 * 60 * 1000;
const DRAFT_SAVE_DEBOUNCE_MS = 300;

export interface PendingFormAuthState {
  formData: ApplicationFormData;
  shouldAutoSubmit: boolean;
  createdAt: number;
}

type DraftStorageOperation = "read" | "write" | "remove" | "parse";
type PendingDraft = { kind: "persist"; formData: ApplicationFormData } | { kind: "clear" };

function getFormAuthPersistenceKey(programId: string, formId?: string): string {
  return `${FORM_AUTH_PERSISTENCE_KEY_PREFIX}:${programId}:${formId ?? "default"}`;
}

export function hasMeaningfulFormValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasMeaningfulFormValue);
  }
  return true;
}

export function hasMeaningfulFormData(data: Partial<ApplicationFormData>): boolean {
  return Object.values(data).some(hasMeaningfulFormValue);
}

function logFormDraftStorageError(
  error: unknown,
  operation: DraftStorageOperation,
  programId: string,
  formId: string
) {
  Sentry.captureException(error, {
    tags: {
      component: "useFormDraftPersistence",
      errorId: "application-form-draft-storage-failed",
    },
    extra: { operation, programId, formId },
  });
}

interface UseFormDraftPersistenceOptions {
  programId: string;
  formId?: string;
}

export interface FormDraftPersistence {
  pendingSubmitRef: React.MutableRefObject<boolean>;
  persistFormStateForAuth: (formData: ApplicationFormData, shouldAutoSubmit: boolean) => void;
  clearPersistedFormStateForAuth: () => void;
  readPersistedFormStateForAuth: () => PendingFormAuthState | null;
  schedulePersistOrClear: (data: Partial<ApplicationFormData>) => void;
  flushPendingDraftPersistence: () => void;
}

export const DRAFT_PERSISTENCE_DEBOUNCE_MS = DRAFT_SAVE_DEBOUNCE_MS;
export const DRAFT_PERSISTENCE_TTL_MS = FORM_AUTH_PERSISTENCE_TTL_MS;

export function useFormDraftPersistence({
  programId,
  formId,
}: UseFormDraftPersistenceOptions): FormDraftPersistence {
  const pendingSubmitRef = useRef(false);
  const draftPersistenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraftPersistenceRef = useRef<PendingDraft | null>(null);
  const hasShownDraftStorageWarningRef = useRef(false);

  const authPersistenceKey = useMemo(
    () => getFormAuthPersistenceKey(programId, formId),
    [programId, formId]
  );

  const handleDraftStorageError = useCallback(
    (error: unknown, operation: DraftStorageOperation) => {
      logFormDraftStorageError(error, operation, programId, formId ?? "default");
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
      if (
        !parsed?.formData ||
        typeof parsed.createdAt !== "number" ||
        Date.now() - parsed.createdAt > FORM_AUTH_PERSISTENCE_TTL_MS
      ) {
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

  return {
    pendingSubmitRef,
    persistFormStateForAuth,
    clearPersistedFormStateForAuth,
    readPersistedFormStateForAuth,
    schedulePersistOrClear,
    flushPendingDraftPersistence,
  };
}
