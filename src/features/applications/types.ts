import type { Application } from "@/types/whitelabel-entities";

export interface ApplicationFormData {
  [questionId: string]: unknown;
}

export interface UseApplicationReturn {
  application: Application | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
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
