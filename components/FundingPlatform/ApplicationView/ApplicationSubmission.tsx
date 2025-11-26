'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/Utilities/Button';
import { IFormSchema } from '@/types/funding-platform';
import { cn } from '@/utilities/tailwind';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';

interface IApplicationSubmissionProps {
  programId: string;
  chainId: number;
  formSchema: IFormSchema;
  onSubmit?: (applicationData: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Record<string, any>;
  isEditMode?: boolean;
}

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";
const inputStyle = "mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300";

const ApplicationSubmission: FC<IApplicationSubmissionProps> = ({
  programId,
  chainId,
  formSchema,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData,
  isEditMode = false,
}) => {
  const { address } = useAccount();
  const [submitting, setSubmitting] = useState(false);

  // Generate dynamic Zod schema based on form schema
  const generateValidationSchema = useCallback((schema: IFormSchema) => {
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
        case 'textarea':
        case 'text':
        default:
          fieldSchema = z.string();
          break;
      }

      // Apply validation rules
      if (field.validation?.min) {
        fieldSchema = fieldSchema.min(field.validation.min, 
          `Minimum ${field.validation.min} characters required`);
      }
      if (field.validation?.max) {
        fieldSchema = fieldSchema.max(field.validation.max, 
          `Maximum ${field.validation.max} characters allowed`);
      }

      // Apply required validation
      if (field.required) {
        fieldSchema = fieldSchema.min(1, `${field.label} is required`);
      } else {
        fieldSchema = fieldSchema.optional().or(z.literal(''));
      }

      schemaObject[field.label.toLowerCase().replace(/\s+/g, '_')] = fieldSchema;
    });

    return z.object(schemaObject);
  }, []);

  const validationSchema = generateValidationSchema(formSchema);
  type FormData = z.infer<typeof validationSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(validationSchema),
    mode: 'onChange',
  });

  // Pre-fill form when initialData is provided (edit mode)
  useEffect(() => {
    if (initialData && formSchema.fields.length > 0) {
      const formData: Record<string, any> = {};
      
      // Map applicationData keys to form field names
      formSchema.fields.forEach((field) => {
        const fieldName = field.label.toLowerCase().replace(/\s+/g, '_');
        
        // Try to find matching key in initialData
        // First try exact match with fieldName
        if (initialData[fieldName] !== undefined) {
          formData[fieldName] = initialData[fieldName];
        } else {
          // Try to find by field label (case-insensitive)
          const matchingKey = Object.keys(initialData).find(
            key => key.toLowerCase() === field.label.toLowerCase() || 
                   key.toLowerCase() === fieldName
          );
          if (matchingKey && initialData[matchingKey] !== undefined) {
            formData[fieldName] = initialData[matchingKey];
          }
        }
      });
      
      reset(formData);
    }
  }, [initialData, formSchema.fields, reset]);

  const handleFormSubmit: SubmitHandler<FormData> = async (data) => {
    if (!address) {
      toast.error('Please connect your wallet to submit an application');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit?.(data);
      if (!isEditMode) {
        toast.success('Application submitted successfully!');
        reset();
      }
      // For edit mode, success toast is handled by the parent component
    } catch (error) {
      console.error('Error submitting application:', error);
      if (!isEditMode) {
        toast.error('Failed to submit application. Please try again.');
      }
      // For edit mode, error toast is handled by the hook
      throw error; // Re-throw so parent can handle
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any, index: number) => {
    const fieldName = field.label.toLowerCase().replace(/\s+/g, '_');
    const error = errors[fieldName as keyof FormData];
    const errorMessage = error?.message || error;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={index} className="flex w-full flex-col">
            <label htmlFor={fieldName} className={labelStyle}>
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              id={fieldName}
              className={cn(inputStyle, "min-h-[100px] resize-y")}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...register(fieldName as keyof FormData)}
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
            </label>
            <select
              id={fieldName}
              className={cn(inputStyle)}
              {...register(fieldName as keyof FormData)}
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
            </label>
            <div className="mt-2 space-y-2">
              {field.options?.map((option: string, optIndex: number) => (
                <label key={optIndex} className="flex items-center">
                  <input
                    type="checkbox"
                    value={option}
                    className="mr-2 h-4 w-4 rounded border-gray-300"
                    {...register(fieldName as keyof FormData)}
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
            </label>
            <div className="mt-2 space-y-2">
              {field.options?.map((option: string, optIndex: number) => (
                <label key={optIndex} className="flex items-center">
                  <input
                    type="radio"
                    value={option}
                    className="mr-2 h-4 w-4 border-gray-300"
                    {...register(fieldName as keyof FormData)}
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
            </label>
            <input
              type="number"
              id={fieldName}
              className={cn(inputStyle)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...register(fieldName as keyof FormData)}
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
            </label>
            <input
              type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
              id={fieldName}
              className={cn(inputStyle)}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              {...register(fieldName as keyof FormData)}
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
    <div className="flex flex-col w-full space-y-6">
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
            isLoading={submitting || isLoading}
            disabled={!isValid || submitting || isLoading}
            variant="primary"
            className="px-6 py-2"
          >
            {isEditMode ? 'Update Application' : 'Submit Application'}
          </Button>
        </div>
      </form>

      {/* Connected Wallet Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Submitting as: {address}
      </div>
    </div>
  );
};

export default ApplicationSubmission; 