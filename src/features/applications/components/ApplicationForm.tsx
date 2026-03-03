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
import { useRealTimeAIEvaluation } from "@/hooks/useRealTimeAIEvaluation";
import type { ApplicationQuestion, IFormSchema } from "@/types/whitelabel-entities";
import { cn } from "@/utilities/tailwind";
import { useApplicationForm } from "../hooks/use-application-form";
import type { ApplicationFormData } from "../types";
import { AIEvaluationDisplay } from "./AIEvaluationDisplay";
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
  formSchema?: IFormSchema;
  multiStep?: boolean;
  initialData?: ApplicationFormData;
  onSubmit: (
    data: ApplicationFormData,
    aiEvaluation?: { evaluation: string; promptId: string }
  ) => Promise<void>;
  onCancel?: () => void;
  onDataChange?: (data: Partial<ApplicationFormData>) => void;
  hideActions?: boolean;
  isDisabled?: boolean;
  programName?: string;
  formId?: string;
}

export function ApplicationForm({
  programId,
  questions,
  formSchema,
  multiStep = false,
  initialData,
  onSubmit,
  onCancel,
  onDataChange,
  hideActions = false,
  isDisabled = false,
  programName,
  formId,
}: ApplicationFormProps) {
  const { authenticated, login } = useAuth();

  const {
    formState,
    validateForm,
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

  // AI Evaluation hook (P0-09)
  const hasEvalConfig = Boolean(formSchema?.aiConfig?.enableRealTimeEvaluation);
  const {
    evaluation,
    evaluationResponse,
    isLoading: isEvaluating,
    error: evaluationError,
    triggerEvaluation,
    clearEvaluation,
  } = useRealTimeAIEvaluation({
    programId,
    isEnabled: hasEvalConfig,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [hasScored, setHasScored] = useState(false);
  const [isScoring, setIsScoring] = useState(false);

  // P2-15: Wire onDataChange with RHF watch() subscription
  useEffect(() => {
    const { unsubscribe } = watch((value) => {
      onDataChange?.(value as Partial<ApplicationFormData>);
    });
    return unsubscribe;
  }, [watch, onDataChange]);

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
      const aiEvaluationData =
        evaluationResponse && hasScored
          ? {
              evaluation:
                typeof evaluationResponse.data === "object"
                  ? JSON.stringify(evaluationResponse.data)
                  : String(evaluationResponse.data),
              promptId: evaluationResponse.promptId,
            }
          : undefined;

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
      await onSubmit(labeledFormData, aiEvaluationData);
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

  const handleScore = async () => {
    const isValid = await validateForm();
    if (!isValid) {
      scrollToFirstError();
      return;
    }

    setIsScoring(true);
    try {
      const evaluationData: Record<string, unknown> = {};
      questions.forEach((question) => {
        const value = formState.data[question.id];
        if (value !== undefined && value !== null && value !== "") {
          evaluationData[question.label || question.id] = value;
        }
      });

      await triggerEvaluation(evaluationData);
      setHasScored(true);
    } catch {
      setHasScored(true); // Allow submission even if evaluation fails
    } finally {
      setIsScoring(false);
    }
  };

  const handleRescore = async () => {
    clearEvaluation();
    setHasScored(false);
    await handleScore();
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
      <div className={cn("grid gap-6", hasEvalConfig && hasScored && "lg:grid-cols-3")}>
        <div className={cn(hasEvalConfig && hasScored && "lg:col-span-2")}>
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

            {!hideActions && (
              <div className="mt-6 rounded-lg border bg-card p-4">
                <div className="flex justify-between items-center">
                  {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    {!authenticated ? (
                      <Button type="button" onClick={handleLogin}>
                        Login to submit
                      </Button>
                    ) : hasEvalConfig && !hasScored && !isDisabled ? (
                      <div className="flex flex-row gap-2 items-center">
                        <Button
                          type="button"
                          onClick={handleScore}
                          isLoading={isScoring || isEvaluating}
                          disabled={isScoring || isEvaluating}
                          data-testid="get-ai-feedback-btn"
                        >
                          Get AI Feedback
                        </Button>
                        <span
                          className="flex items-center font-bold justify-center w-5 h-5 rounded-full border border-gray-400 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs cursor-help"
                          title="You'll see feedback and can make changes before submitting."
                        >
                          ?
                        </span>
                      </div>
                    ) : hasEvalConfig && hasScored && !isDisabled ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRescore}
                          disabled={isSubmitting || isScoring || isEvaluating}
                          isLoading={isScoring || isEvaluating}
                          data-testid="rescore-btn"
                        >
                          {isScoring || isEvaluating
                            ? "Evaluating..."
                            : "Re-evaluate my application"}
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting || isScoring || isEvaluating}
                          isLoading={isSubmitting}
                          data-testid="submit-application-btn"
                        >
                          Submit My Application
                        </Button>
                      </>
                    ) : !isDisabled ? (
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        isLoading={isSubmitting}
                        data-testid="submit-application-btn"
                      >
                        Submit My Application
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* AI Evaluation Sidebar */}
        {hasEvalConfig && hasScored && (
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <AIEvaluationDisplay
                evaluation={evaluation}
                isLoading={isEvaluating}
                isEnabled
                hasError={!!evaluationError}
                programName={programName}
              />
              {evaluationError && (
                <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">AI Evaluation Error: {evaluationError}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
