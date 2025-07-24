export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'email' | 'url' | 'date';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // for select, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
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
  };
  // AI configuration for the entire form
  aiConfig?: {
    systemPrompt?: string;
    detailedPrompt?: string;
    aiModel?: string;
    enableRealTimeEvaluation?: boolean;
  };
}

export interface FormSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  submittedAt: string;
  submitterAddress?: string;
}