export interface FormField {
  id: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "radio"
    | "checkbox"
    | "number"
    | "email"
    | "url"
    | "date"
    | "milestone";
  label: string;
  placeholder?: string;
  required?: boolean;
  private?: boolean; // Whether this field should be hidden from public responses
  options?: string[]; // for select, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
    maxMilestones?: number;
    minMilestones?: number;
  };
  description?: string;
  // AI evaluation configuration
  aiEvaluation?: {
    triggerOnChange?: boolean; // Whether to trigger AI evaluation when this field changes
    includeInEvaluation?: boolean; // Whether to include this field in AI evaluation context
  };
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  settings: {
    submitButtonText: string;
    confirmationMessage: string;
    privateApplications?: boolean; // Whether this program has private applications
    donationRound?: boolean; // Whether this is a donation round
    successPageContent?: string; // Markdown content for "What happens next?" section on success page
    showCommentsOnPublicPage?: boolean; // Whether to show comments on public application pages
    approvalEmailTemplate?: string; // Markdown/HTML template for approval emails with variable placeholders
    approvalEmailSubject?: string; // Custom subject for approval emails with variable placeholders (e.g., {{programName}})
    rejectionEmailTemplate?: string; // Markdown/HTML template for rejection emails with variable placeholders
    rejectionEmailSubject?: string; // Custom subject for rejection emails with variable placeholders (e.g., {{programName}})
  };
  // AI configuration for the entire form
  aiConfig?: {
    systemPrompt?: string;
    detailedPrompt?: string;
    aiModel?: string;
    enableRealTimeEvaluation?: boolean;
    langfusePromptId?: string;
    internalLangfusePromptId?: string;
  };
  // Email addresses that should receive post-approval notifications (only for post-approval forms)
  emailNotifications?: string[];
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: string;
  submitterAddress?: string;
}
