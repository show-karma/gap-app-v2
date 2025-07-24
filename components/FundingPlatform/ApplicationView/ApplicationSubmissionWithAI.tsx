'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/Utilities/Button';
import { IFormSchema, IFundingApplication } from '@/types/funding-platform';
import { cn } from '@/utilities/tailwind';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import { AIEvaluationDisplay } from '@/components/FundingPlatform/AIEvaluationDisplay';
import { useRealTimeAIEvaluation } from '@/hooks/useRealTimeAIEvaluation';
import { FormSchema } from '@/types/question-builder';
import { LoadingOverlay } from '@/components/Utilities/LoadingOverlay';
import { useApplicationSubmissionV2, useApplicationUpdateV2 } from '@/hooks/useFundingPlatform';

interface IApplicationSubmissionWithAIProps {
  programId: string;
  chainId: number;
  formSchema: FormSchema; // Using the enhanced FormSchema with AI config
  onSubmit?: (applicationData: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  existingApplication?: IFundingApplication | null;
  isRevision?: boolean;
}

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle = "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300";

const ApplicationSubmissionWithAI: FC<IApplicationSubmissionWithAIProps> = ({
  programId,
  chainId,
  formSchema,
  onSubmit,
  onCancel,
  isLoading = false,
  existingApplication,
  isRevision = false,
}) => {
  const { address } = useAccount();
  const [submitting, setSubmitting] = useState(false);
  
  // Ref to track if we're already evaluating to prevent multiple simultaneous calls
  const isEvaluatingRef = useRef(false);
  
  // Use V2 submission or update hook based on revision state
  const { submitApplication, isSubmitting } = useApplicationSubmissionV2(programId, chainId);
  const { updateApplication, isUpdating } = useApplicationUpdateV2();

  // Real-time AI evaluation hook
  const {
    evaluation,
    isLoading: isEvaluating,
    error: evaluationError,
    triggerEvaluation,
    clearEvaluation,
  } = useRealTimeAIEvaluation({
    programId,
    chainId,
    isEnabled: formSchema.aiConfig?.enableRealTimeEvaluation || false,
  });

  // Generate dynamic Zod schema based on form schema
  const generateValidationSchema = useCallback((schema: FormSchema) => {
    const schemaObject: Record<string, any> = {};
    
    schema.fields.forEach((field) => {
      let fieldSchema: any;
      
      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email('Please enter a valid email address');
          break;
        case 'url':
          fieldSchema = z.string().url('Please enter a valid URL');
          break;
        case 'number':
          fieldSchema = z.string().refine((val) => !isNaN(Number(val)), {
            message: 'Please enter a valid number',
          });
          break;
        case 'checkbox':
          fieldSchema = z.array(z.string()).optional();
          break;
        case 'textarea':
        case 'text':
        default:
          fieldSchema = z.string();
          break;
      }

      // Apply validation rules (skip for checkbox arrays)
      if (field.type !== 'checkbox') {
        if (field.validation?.min) {
          fieldSchema = fieldSchema.min(field.validation.min, 
            `Minimum ${field.validation.min} characters required`);
        }
        if (field.validation?.max) {
          fieldSchema = fieldSchema.max(field.validation.max, 
            `Maximum ${field.validation.max} characters allowed`);
        }

        // Apply required validation for non-checkbox fields
        if (field.required) {
          fieldSchema = fieldSchema.min(1, `${field.label} is required`);
        } else {
          fieldSchema = fieldSchema.optional().or(z.literal(''));
        }
      } else {
        // Special handling for checkbox fields
        if (field.required) {
          fieldSchema = z.array(z.string()).min(1, `Please select at least one option for ${field.label}`);
        } else {
          fieldSchema = z.array(z.string()).optional();
        }
      }

      schemaObject[field.id] = fieldSchema;
    });

    return z.object(schemaObject);
  }, []);

  const validationSchema = generateValidationSchema(formSchema);
  type FormData = z.infer<typeof validationSchema>;
  
  // Generate default values from existing application if it's a revision
  const getDefaultValues = useCallback(() => {
    if (!existingApplication || !isRevision) return {};
    
    const defaultValues: Record<string, any> = {};
    
    // Map application data back to field IDs
    formSchema.fields.forEach(field => {
      const existingValue = existingApplication.applicationData[field.label];
      if (existingValue !== undefined) {
        defaultValues[field.id] = existingValue;
      }
    });
    
    return defaultValues;
  }, [existingApplication, isRevision, formSchema.fields]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(validationSchema),
    mode: 'onChange',
    defaultValues: getDefaultValues(),
  });

  // Store refs to avoid useCallback recreation
  const formSchemaRef = useRef(formSchema);
  const getValuesRef = useRef(getValues);
  const triggerEvaluationRef = useRef(triggerEvaluation);
  
  // Update refs on each render
  formSchemaRef.current = formSchema;
  getValuesRef.current = getValues;
  triggerEvaluationRef.current = triggerEvaluation;

  // Function to trigger evaluation when user moves to next field
  // Now accepts the specific field that triggered the blur
  const handleFieldBlur = useCallback((fieldId: string) => {
    const currentFormSchema = formSchemaRef.current;
    const getCurrentValues = getValuesRef.current;
    const currentTriggerEvaluation = triggerEvaluationRef.current;

    if (!currentFormSchema.aiConfig?.enableRealTimeEvaluation) return;
    if (isEvaluatingRef.current) return; // Prevent multiple simultaneous evaluations

    // Find the specific field that was blurred
    const blurredField = currentFormSchema.fields.find(field => field.id === fieldId);
    
    // Only proceed if this specific field has AI evaluation trigger enabled
    if (!blurredField?.aiEvaluation?.triggerOnChange) {
      return;
    }

    // Get current form values
    const currentValues = getCurrentValues();

    // Only include fields that have meaningful content for evaluation
    const evaluationData: Record<string, any> = {};
    currentFormSchema.fields.forEach(field => {
      if (field.aiEvaluation?.includeInEvaluation !== false) {
        const value = currentValues[field.id];
        
        // Handle different field types
        let hasContent = false;
        let processedValue = value;
        
        if (field.type === 'checkbox') {
          // For checkboxes, check if array has items
          hasContent = Array.isArray(value) && value.length > 0;
          processedValue = Array.isArray(value) ? value.join(', ') : value;
        } else {
          // For other fields, check string content
          hasContent = value && value.toString().trim().length > 0;
        }
        
        if (hasContent) {
          evaluationData[field.label] = processedValue;
        }
      }
    });

    // Only trigger evaluation if we have at least one field with substantial content
    const hasSubstantialData = Object.values(evaluationData).some(value => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value && value.toString().trim().length >= 3;
    });

    if (hasSubstantialData && Object.keys(evaluationData).length > 0) {
      isEvaluatingRef.current = true;
      currentTriggerEvaluation(evaluationData);
    }
  }, []); // Remove dependencies to prevent recreation

  // Reset the evaluation flag when evaluation completes
  useEffect(() => {
    if (!isEvaluating) {
      isEvaluatingRef.current = false;
    }
  }, [isEvaluating]);

  const handleFormSubmit: SubmitHandler<FormData> = async (data) => {
    if (!address) {
      toast.error('Please connect your wallet to submit an application');
      return;
    }

    // Convert field IDs back to labels for submission
    const submissionData: Record<string, any> = {};
    let applicantEmail = '';
    
    formSchema.fields.forEach(field => {
      submissionData[field.label] = data[field.id];
      
      // Extract email for V2 submission
      if (field.type === 'email' || field.label.toLowerCase().includes('email')) {
        applicantEmail = data[field.id] as string;
      }
    });
    
    // If no email field found, check the data for any email-like value
    if (!applicantEmail) {
      const emailValue = Object.values(data).find(value => 
        typeof value === 'string' && value.includes('@')
      );
      if (emailValue) {
        applicantEmail = emailValue as string;
      }
    } else {
      
    }
    
    if (!applicantEmail) {
      toast.error('An email address is required for submission');
      return;
    }

    // Handle revision update vs new submission
    if (isRevision && existingApplication) {
      // Use update hook for revisions
      updateApplication({
        applicationId: existingApplication.id,
        applicationData: submissionData
      });
    } else {
      // Use custom onSubmit if provided, otherwise use V2 submission
      if (onSubmit) {
        setSubmitting(true);
        try {
          await onSubmit(submissionData);
          reset();
          clearEvaluation();
        } catch (error) {
          // Error handling is done in the parent component
          throw error;
        } finally {
          setSubmitting(false);
        }
      } else {
        // Use V2 submission directly
        submitApplication({
          programId,
          chainID: chainId,
          applicantEmail,
          applicationData: submissionData
        });
        reset();
        clearEvaluation();
      }
    }
  };

  const renderField = (field: any, index: number) => {
    const fieldName = field.id;
    const error = errors[fieldName as keyof FormData];
    const errorMessage = error?.message || error;

    // Check if this field triggers AI evaluation
    const triggersAI = field.aiEvaluation?.triggerOnChange;

    const fieldClassName = cn(
      inputStyle,
      triggersAI && formSchema.aiConfig?.enableRealTimeEvaluation 
        ? "border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
        : ""
    );

    switch (field.type) {
      case 'textarea':
        return (
          <div key={index} className="flex w-full flex-col">
            <label htmlFor={fieldName} className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
              {triggersAI && formSchema.aiConfig?.enableRealTimeEvaluation && (
                <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
                  AI Feedback
                </span>
              )}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {field.description}
              </p>
            )}
            <textarea
              id={fieldName}
              className={cn(fieldClassName, "min-h-[100px] resize-y")}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...register(fieldName as keyof FormData)}
              onBlur={triggersAI ? () => handleFieldBlur(field.id) : undefined}
            />
            {error && (
              <p className="text-sm text-red-400 mt-1">{String(errorMessage)}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={index} className="flex w-full flex-col">
            <label htmlFor={fieldName} className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
              {triggersAI && formSchema.aiConfig?.enableRealTimeEvaluation && (
                <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
                  AI Feedback
                </span>
              )}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {field.description}
              </p>
            )}
            <select
              id={fieldName}
              className={fieldClassName}
              {...register(fieldName as keyof FormData)}
              onBlur={triggersAI ? () => handleFieldBlur(field.id) : undefined}
            >
              <option value="">Select an option</option>
              {field.options?.map((option: string, optIndex: number) => (
                <option key={optIndex} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {error && (
              <p className="text-sm text-red-400 mt-1">{String(errorMessage)}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={index} className="flex w-full flex-col">
            <label className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
              {triggersAI && formSchema.aiConfig?.enableRealTimeEvaluation && (
                <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
                  AI Feedback
                </span>
              )}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {field.description}
              </p>
            )}
            <div className="mt-2 space-y-2">
              {field.options?.map((option: string, optIndex: number) => (
                <label key={optIndex} className="flex items-center">
                  <input
                    type="checkbox"
                    value={option}
                    className="mr-2 h-4 w-4 rounded border-gray-300"
                    {...register(fieldName as keyof FormData)}
                    onBlur={triggersAI ? () => handleFieldBlur(field.id) : undefined}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {option}
                  </span>
                </label>
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-400 mt-1">{String(errorMessage)}</p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={index} className="flex w-full flex-col">
            <label className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
              {triggersAI && formSchema.aiConfig?.enableRealTimeEvaluation && (
                <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
                  AI Feedback
                </span>
              )}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {field.description}
              </p>
            )}
            <div className="mt-2 space-y-2">
              {field.options?.map((option: string, optIndex: number) => (
                <label key={optIndex} className="flex items-center">
                  <input
                    type="radio"
                    value={option}
                    className="mr-2 h-4 w-4 border-gray-300"
                    {...register(fieldName as keyof FormData)}
                    onBlur={triggersAI ? () => handleFieldBlur(field.id) : undefined}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {option}
                  </span>
                </label>
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-400 mt-1">{String(errorMessage)}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={index} className="flex w-full flex-col">
            <label htmlFor={fieldName} className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
              {triggersAI && formSchema.aiConfig?.enableRealTimeEvaluation && (
                <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
                  AI Feedback
                </span>
              )}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {field.description}
              </p>
            )}
            <input
              type="number"
              id={fieldName}
              className={fieldClassName}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...register(fieldName as keyof FormData)}
              onBlur={triggersAI ? () => handleFieldBlur(field.id) : undefined}
            />
            {error && (
              <p className="text-sm text-red-400 mt-1">{String(errorMessage)}</p>
            )}
          </div>
        );

      case 'email':
      case 'url':
      case 'text':
      default:
        return (
          <div key={index} className="flex w-full flex-col">
            <label htmlFor={fieldName} className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
              {triggersAI && formSchema.aiConfig?.enableRealTimeEvaluation && (
                <span className="ml-2 text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">
                  AI Feedback
                </span>
              )}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {field.description}
              </p>
            )}
            <input
              type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
              id={fieldName}
              className={fieldClassName}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...register(fieldName as keyof FormData)}
              onBlur={triggersAI ? () => handleFieldBlur(field.id) : undefined}
            />
            {error && (
              <p className="text-sm text-red-400 mt-1">{String(errorMessage)}</p>
            )}
          </div>
        );
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Wallet Connection Required
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please connect your wallet to submit a grant application.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Section */}
      <div className="lg:col-span-2">
        <div className="relative flex flex-col w-full space-y-6">
          {/* Loading Overlay for form submission */}
          <LoadingOverlay 
            isLoading={submitting} 
            message="Submitting application..." 
          />
          
          {/* Header */}
          <div className="flex flex-col space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formSchema.title}
            </h2>
            {formSchema.description && (
              <p className="text-gray-600 dark:text-gray-400">
                {formSchema.description}
              </p>
            )}
            {formSchema.aiConfig?.enableRealTimeEvaluation && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ✨ This form includes AI-powered feedback to help you improve your application as you type.
                </p>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {formSchema.fields.map((field, index) => renderField(field, index))}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              {onCancel && (
                <Button
                  type="button"
                  onClick={onCancel}
                  variant="secondary"
                  disabled={submitting || isLoading}
                  className="px-6 py-2"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                isLoading={submitting || isLoading || isSubmitting || isUpdating}
                disabled={!isValid || submitting || isLoading || isSubmitting || isUpdating}
                variant="primary"
                className="px-6 py-2"
              >
                {isRevision ? 'Update Application' : 'Submit Application'}
              </Button>
            </div>
          </form>

          {/* Connected Wallet Info */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Submitting as: {address}
          </div>
        </div>
      </div>

      {/* AI Evaluation Sidebar */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 relative">
          {/* Loading Overlay for AI evaluation */}
          <LoadingOverlay 
            isLoading={isEvaluating} 
            message="Evaluating with AI..." 
          />
          
          <AIEvaluationDisplay
            evaluation={evaluation}
            isLoading={isEvaluating}
            isEnabled={formSchema.aiConfig?.enableRealTimeEvaluation || false}
          />
          
          {evaluationError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                AI evaluation temporarily unavailable: {evaluationError}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationSubmissionWithAI; 