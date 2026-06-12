import type { Application } from "@/types/whitelabel-entities";

export interface ApplicationFormData {
  [questionId: string]: unknown;
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
