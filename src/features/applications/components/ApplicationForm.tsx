"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { useApplicationForm } from "../hooks/use-application-form";
import type { ApplicationFormData } from "../types";
import { ApplicationFormSection } from "./ApplicationFormSection";

const FORM_AUTH_PERSISTENCE_KEY_PREFIX = "gap:application-form-auth";
const FORM_AUTH_PERSISTENCE_TTL_MS = 30 * 60 * 1000;

interface PendingFormAuthState {
  formData: ApplicationFormData;
  shouldAutoSubmit: boolean;
  createdAt: number;
}

function getFormAuthPersistenceKey(programId: string, formId?: string): string {
  return `${FORM_AUTH_PERSISTENCE_KEY_PREFIX}:${programId}:${formId ?? "default"}`;
}

interface ApplicationFormProps {
  programId: string;
  questions: ApplicationQuestion[];
  multiStep?: boolean;
  initialData?: ApplicationFormData;
  onSubmit: (
    data: ApplicationFormData,
    aiEvaluation?: { evaluation: string; promptId: string }
  ) => Promise<void>;
  onDataChange?: (data: Partial<ApplicationFormData>) => void;
  hideActions?: boolean;
  isDisabled?: boolean;
  formId?: string;
}

export function ApplicationForm({
  programId,
  questions,
  multiStep = false,
  initialData,
  onSubmit,
  hideActions = false,
  isDisabled = false,
  formId,
}: ApplicationFormProps) {
  const { authenticated, login } = useAuth();

  const {
    formState,
    setFormData,
    goToStep,
    control,
    handleSubmit: formHandleSubmit,
    watch,
    trigger,
  } = useApplicationForm(questions, { multiStep, initialData });

  const pendingSubmitRef = useRef(false);
  const authPersistenceKey = useMemo(
    () => getFormAuthPersistenceKey(programId, formId),
    [programId, formId]
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
      } catch {
        // Ignore storage failures
      }
    },
    [authPersistenceKey]
  );

  const clearPersistedFormStateForAuth = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(authPersistenceKey);
    } catch {
      // Ignore storage failures
    }
  }, [authPersistenceKey]);

  const readPersistedFormStateForAuth = useCallback((): PendingFormAuthState | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(authPersistenceKey);
      if (!raw) return null;
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
    } catch {
      clearPersistedFormStateForAuth();
      return null;
    }
  }, [authPersistenceKey, clearPersistedFormStateForAuth]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const scrollToFirstError = () => {
    const errorFieldIndex = questions.findIndex((q) => formState.errors[q.id]);
    if (errorFieldIndex === -1) return;
    const firstErrorField = questions[errorFieldIndex];

    if (multiStep) {
      const errorStep = Math.floor(errorFieldIndex / 5);
      if (errorStep !== formState.currentStep) {
        goToStep(errorStep);
        setTimeout(() => scrollToFirstError(), 100);
        return;
      }
    }

    let element = document.querySelector(`[data-field-id="${firstErrorField.id}"]`);

    if (!element) {
      const selectors = [`[name="${firstErrorField.id}"]`, `[id="${firstErrorField.id}"]`];
      for (const selector of selectors) {
        try {
          element = document.querySelector(selector);
          if (element) break;
        } catch {
          // Continue trying
        }
      }
    }

    if (element) {
      const yOffset = -120;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });

      const focusableElement = element.querySelector('input, textarea, select, [role="textbox"]');
      if (focusableElement instanceof HTMLElement) {
        setTimeout(() => focusableElement.focus(), 300);
      }
    }
  };

  const handleSubmit = async (data: ApplicationFormData) => {
    if (!authenticated) {
      pendingSubmitRef.current = true;
      persistFormStateForAuth(data, true);
      setShowLoginPrompt(true);
      return;
    }

    pendingSubmitRef.current = false;
    clearPersistedFormStateForAuth();
    setIsSubmitting(true);
    try {
      const labeledFormData: Record<string, unknown> = {};
      questions.forEach((question) => {
        const key = question.label || question.id;
        const value = data[question.id];
        const hasValue =
          value !== undefined &&
          value !== null &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0);
        if (hasValue) {
          labeledFormData[key] = value;
        }
      });
      await onSubmit(labeledFormData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const persistedState = readPersistedFormStateForAuth();
    if (!persistedState) return;
    setFormData(persistedState.formData);
    pendingSubmitRef.current = persistedState.shouldAutoSubmit;
    if (authenticated && persistedState.shouldAutoSubmit) {
      pendingSubmitRef.current = false;
      clearPersistedFormStateForAuth();
      setShowLoginPrompt(false);
      formRef.current?.requestSubmit();
    }
  }, [readPersistedFormStateForAuth, setFormData, authenticated, clearPersistedFormStateForAuth]);

  useEffect(() => {
    if (authenticated && pendingSubmitRef.current) {
      pendingSubmitRef.current = false;
      clearPersistedFormStateForAuth();
      setShowLoginPrompt(false);
      formRef.current?.requestSubmit();
    }
  }, [authenticated, clearPersistedFormStateForAuth]);

  const handleLogin = async () => {
    try {
      const currentFormData = watch();
      if (
        currentFormData &&
        typeof currentFormData === "object" &&
        Object.keys(currentFormData).length > 0
      ) {
        persistFormStateForAuth(currentFormData as ApplicationFormData, false);
      }
      await login();
    } catch {
      // Login errors handled by auth provider
    }
  };

  const sections = useMemo(
    () =>
      multiStep
        ? questions.reduce((acc, question, index) => {
            const sectionIndex = Math.floor(index / 5);
            if (!acc[sectionIndex]) {
              acc[sectionIndex] = [];
            }
            acc[sectionIndex].push(question);
            return acc;
          }, [] as ApplicationQuestion[][])
        : [questions],
    [multiStep, questions]
  );

  const currentQuestions = multiStep ? sections[formState.currentStep] || [] : questions;

  return (
    <div className="w-full max-w-full" data-testid="application-form-container">
      <form
        ref={formRef}
        id={formId}
        data-testid="application-form"
        onSubmit={formHandleSubmit(handleSubmit, () => {
          scrollToFirstError();
        })}
      >
        <ApplicationFormSection
          questions={currentQuestions}
          control={control}
          disabled={isSubmitting || isDisabled}
          trigger={trigger}
        />

        {!hideActions && !isDisabled && (
          <div className="mt-6 rounded-lg border bg-card p-4">
            <div className="flex justify-end items-center">
              <div className="flex items-center gap-2">
                {!authenticated ? (
                  <Button type="button" onClick={handleLogin}>
                    Login to submit
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    data-testid="submit-application-btn"
                  >
                    Submit My Application
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </form>

      <Dialog
        open={showLoginPrompt}
        onOpenChange={(open) => {
          if (!open) {
            pendingSubmitRef.current = false;
            clearPersistedFormStateForAuth();
            setShowLoginPrompt(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Wallet Required</DialogTitle>
          </DialogHeader>
          <p className="text-zinc-600 dark:text-zinc-400">
            You need to connect your wallet to submit an application. This ensures your application
            is securely linked to your wallet address.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                pendingSubmitRef.current = false;
                clearPersistedFormStateForAuth();
                setShowLoginPrompt(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleLogin}>Connect Wallet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
