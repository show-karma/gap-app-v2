'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { FormSchema } from '@/types/question-builder';
import { Button } from '@/components/Utilities/Button';

interface QuestionFormRendererProps {
  schema: FormSchema;
  onSubmit?: (data: Record<string, any>) => void;
  className?: string;
  isSubmitting?: boolean;
}

export function QuestionFormRenderer({ 
  schema, 
  onSubmit, 
  className = '',
  isSubmitting = false 
}: QuestionFormRendererProps) {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onFormSubmit = (data: Record<string, any>) => {
    console.log('Question Form submitted:', data);
    onSubmit?.(data);
  };

  const renderField = (field: any) => {
    const commonProps = {
      ...register(field.id, { 
        required: field.required ? `${field.label} is required` : false 
      }),
      className: "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300",
      placeholder: field.placeholder,
      disabled: isSubmitting,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
        return (
          <input
            {...commonProps}
            type={field.type}
          />
        );

      case 'number':
        return (
          <input
            {...commonProps}
            type="number"
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'date':
        return (
          <input
            {...commonProps}
            type="date"
          />
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
          />
        );

      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select an option</option>
            {field.options?.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  {...register(field.id, { 
                    required: field.required ? `${field.label} is required` : false 
                  })}
                  type="radio"
                  value={option}
                  disabled={isSubmitting}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  {...register(`${field.id}.${index}`)}
                  type="checkbox"
                  value={option}
                  disabled={isSubmitting}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return <div>Unsupported field type: {field.type}</div>;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {schema.title}
        </h2>
        {schema.description && (
          <p className="text-gray-600 dark:text-gray-400">
            {schema.description}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {(schema.fields || []).map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {field.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {field.description}
              </p>
            )}
            
            {renderField(field)}
            
            {errors[field.id] && (
              <p className="text-red-500 text-sm mt-1">
                {errors[field.id]?.message as string}
              </p>
            )}
          </div>
        ))}

        <Button 
          type="submit" 
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : (schema.settings?.submitButtonText || 'Submit')}
        </Button>
      </form>
    </div>
  );
}