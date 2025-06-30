export interface IFormField {
  type: 'text' | 'textarea' | 'number' | 'email' | 'url' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface IFormSchema {
  title: string;
  description: string;
  fields: IFormField[];
}

export interface IFundingProgramConfig {
  id: string;
  programId: string;
  chainId: number;
  formSchema?: any; // React Hook Form schema
  schemaType?: 'react-hook-form'; // Always React Hook Form now
  aiConfig?: {
    systemPrompt?: string;
    detailedPrompt?: string;
    model?: string;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFundingApplication {
  id: string;
  referenceNumber: string;
  programId: string;
  chainId: number;
  applicantAddress: string;
  applicationData: Record<string, any>;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  aiEvaluation?: {
    systemEvaluation?: {
      rating: number;
      reasoning: string;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    };
    detailedEvaluation?: {
      rating: number;
      reasoning: string;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
    };
  };
  submittedAt: Date;
  statusHistory: {
    status: string;
    timestamp: Date;
    note?: string;
  }[];
}

export interface IFormBuilderProps {
  schema?: IFormSchema;
  onSchemaChange: (schema: IFormSchema) => void;
  disabled?: boolean;
}

export interface IApplicationViewProps {
  application: IFundingApplication;
  onStatusChange?: (applicationId: string, status: string, note?: string) => void;
}

export interface IApplicationListProps {
  programId: string;
  chainId: number;
  onApplicationSelect?: (application: IFundingApplication) => void;
} 