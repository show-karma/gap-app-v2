export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'email' | 'url' | 'date' | 'milestone';
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
    browseAllApplications?: string; // Optional URL where users can browse all applications
  };
  // AI configuration for the entire form
  aiConfig?: {
    systemPrompt?: string;
    detailedPrompt?: string;
    aiModel?: string;
    enableRealTimeEvaluation?: boolean;
    langfusePromptId?: string;
  };
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: string;
  submitterAddress?: string;
}