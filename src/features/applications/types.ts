import type { Application } from "@/types/whitelabel-entities";

export interface ApplicationFormData {
  [questionId: string]: unknown;
}

interface ApplicationFormErrors {
  [questionId: string]: string;
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

interface UseApplicationReturn {
  application: Application | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface UseApplicationDraftReturn {
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
