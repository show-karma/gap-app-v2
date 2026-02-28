import type { Application, ApplicationQuestion } from "@/types/whitelabel-entities";

export type { ApplicationQuestion };

export interface ApplicationFormData {
  [questionId: string]: unknown;
}

export interface ApplicationFormErrors {
  [questionId: string]: string;
}

export interface ApplicationFormState {
  data: ApplicationFormData;
  errors: ApplicationFormErrors;
  isValid: boolean;
  isDirty: boolean;
  currentStep: number;
}

export interface UseApplicationSubmitReturn {
  submit: (
    programId: string,
    data: ApplicationFormData,
    applicantEmail: string,
    aiEvaluation?: { evaluation: string; promptId: string },
    accessCode?: string
  ) => Promise<Application>;
  isSubmitting: boolean;
  error: Error | null;
}

export interface UseApplicationReturn {
  application: Application | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseApplicationDraftReturn {
  saveDraft: (
    programId: string,
    data: ApplicationFormData,
    applicantEmail: string,
    applicationId?: string
  ) => Promise<Application>;
  deleteDraft: (applicationId: string) => Promise<void>;
  isSavingDraft: boolean;
  isDeletingDraft: boolean;
}
