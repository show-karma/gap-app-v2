"use client";

import * as Sentry from "@sentry/nextjs";
import { Info } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useRealTimeAIEvaluation } from "@/hooks/useRealTimeAIEvaluation";
import type { ApplicationQuestion, IFormSchema } from "@/types/whitelabel-entities";
import { cn } from "@/utilities/tailwind";
import { useApplicationForm } from "../hooks/use-application-form";
import { useFormDraftPersistence } from "../hooks/use-form-draft-persistence";
import type { ApplicationFormData } from "../types";
import { AIEvaluationDisplay } from "./AIEvaluationDisplay";
import { ApplicationFormSection } from "./ApplicationFormSection";

function logApplicationFormError(error: unknown, errorId: string, extra?: Record<string, unknown>) {
  Sentry.captureException(error, {
    tags: {
      component: "ApplicationForm",
      errorId,
    },
    extra,
  });
}

interface ApplicationFormProps {
  programId: string;
  questions: ApplicationQuestion[];
  formSchema?: IFormSchema;
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
    control,
    handleSubmit: formHandleSubmit,
    watch,
    trigger,
  } = useApplicationForm(questions, { initialData });

  const {
    pendingSubmitRef,
    persistFormStateForAuth,
    clearPersistedFormStateForAuth,
    readPersistedFormStateForAuth,
    schedulePersistOrClear,
    flushPendingDraftPersistence,
  } = useFormDraftPersistence({ programId, formId });

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

  const scrollToFirstError = () => {
    const errorFieldIndex = questions.findIndex((q) => formState.errors[q.id]);
    if (errorFieldIndex === -1) return;
    const firstErrorField = questions[errorFieldIndex];

    let element = document.querySelector(`[data-field-id="${firstErrorField.id}"]`);
    const failedSelectors: Array<{ selector: string; errorName?: string }> = [];

    if (!element) {
      const selectors = [`[name="${firstErrorField.id}"]`, `[id="${firstErrorField.id}"]`];
      for (const selector of selectors) {
        try {
          element = document.querySelector(selector);
          if (element) break;
        } catch (error) {
          failedSelectors.push({
            selector,
            errorName: error instanceof Error ? error.name : undefined,
          });
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
    } else {
      logApplicationFormError(
        new Error("No DOM target found for form error field"),
        "application-form-no-error-target",
        { fieldId: firstErrorField.id, failedSelectors }
      );
    }
  };

  const handleSubmit = async (data: ApplicationFormData) => {
    if (!authenticated) {
      pendingSubmitRef.current = true;
      persistFormStateForAuth(data, true);
      setShowLoginPrompt(true);
      return;
    }

    setIsSubmitting(true);
    let submitSucceeded = false;
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
      submitSucceeded = true;
    } catch (error) {
      logApplicationFormError(error, "application-form-submit-failed", { programId });
      toast.error("We couldn't submit your application. Your form data is still here.");
    } finally {
      pendingSubmitRef.current = false;
      setIsSubmitting(false);
    }

    if (submitSucceeded) {
      clearPersistedFormStateForAuth();
    }
  };

  const formRef = useRef<HTMLFormElement>(null);

  const attemptAutoSubmit = useCallback(() => {
    if (formRef.current?.requestSubmit) {
      formRef.current.requestSubmit();
    } else {
      logApplicationFormError(
        new Error("Application form requestSubmit unavailable"),
        "application-form-request-submit-unavailable",
        { programId }
      );
      toast.error("Couldn't auto-submit your application. Please click Submit again.");
    }
  }, [programId]);

  useEffect(() => {
    const persistedState = readPersistedFormStateForAuth();
    if (!persistedState) return;
    setFormData(persistedState.formData);
    pendingSubmitRef.current = persistedState.shouldAutoSubmit;
    if (authenticated && persistedState.shouldAutoSubmit) {
      pendingSubmitRef.current = false;
      setShowLoginPrompt(false);
      attemptAutoSubmit();
    }
  }, [
    readPersistedFormStateForAuth,
    setFormData,
    authenticated,
    attemptAutoSubmit,
    pendingSubmitRef,
  ]);

  useEffect(() => {
    if (authenticated && pendingSubmitRef.current) {
      pendingSubmitRef.current = false;
      setShowLoginPrompt(false);
      attemptAutoSubmit();
    }
  }, [authenticated, attemptAutoSubmit, pendingSubmitRef]);

  const handleLogin = async () => {
    try {
      const currentFormData = watch();
      if (
        currentFormData &&
        typeof currentFormData === "object" &&
        Object.keys(currentFormData).length > 0
      ) {
        persistFormStateForAuth(currentFormData as ApplicationFormData, pendingSubmitRef.current);
      }
      await login();
    } catch (error) {
      logApplicationFormError(error, "application-form-login-failed", { programId });
      toast.error("We couldn't start login. Please check your wallet and try again.");
    }
  };

  const handleScore = async () => {
    const isValid = await validateForm();
    if (!isValid) {
      scrollToFirstError();
      return;
    }

    setIsScoring(true);
    const evaluationData: Record<string, unknown> = {};
    questions.forEach((question) => {
      const value = formState.data[question.id];
      if (value !== undefined && value !== null && value !== "") {
        evaluationData[question.label || question.id] = value;
      }
    });

    try {
      await triggerEvaluation(evaluationData);
    } catch (error) {
      logApplicationFormError(error, "application-form-ai-score-failed", { programId });
      toast.error("We couldn't start AI feedback. You can try again or submit without it.");
    } finally {
      setHasScored(true);
      setIsScoring(false);
    }
  };

  const handleRescore = async () => {
    clearEvaluation();
    setHasScored(false);
    await handleScore();
  };

  const currentQuestions = questions;

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
                <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        AI feedback did not finish
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">{evaluationError}</p>
                    </div>
                  </div>
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
            <DialogDescription>
              You need to connect your wallet to submit an application. This ensures your
              application is securely linked to your wallet address.
            </DialogDescription>
          </DialogHeader>
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
