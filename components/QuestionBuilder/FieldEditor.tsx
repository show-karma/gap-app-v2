'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '@/types/question-builder';
import { Button } from '@/components/Utilities/Button';
import { QuestionTooltip } from '@/components/Utilities/QuestionTooltip';
import { TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { MarkdownEditor } from '../Utilities/MarkdownEditor';

const fieldSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  placeholder: z.string().optional(),
  required: z.boolean(),
  private: z.boolean(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
    maxMilestones: z.number().optional(),
    minMilestones: z.number().optional(),
  }).optional(),
  // AI evaluation configuration
  aiEvaluation: z.object({
    includeInEvaluation: z.boolean().optional(),
  }).optional(),
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: (fieldId: string) => void;
  onMoveUp?: (fieldId: string) => void;
  onMoveDown?: (fieldId: string) => void;
  isPostApprovalMode?: boolean;
}

export function FieldEditor({ field, onUpdate, onDelete, onMoveUp, onMoveDown, isPostApprovalMode = false }: FieldEditorProps) {
  const { register, watch, setValue, formState: { errors } } = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      label: field.label,
      placeholder: field.placeholder || '',
      required: field.required || false,
      private: field.private || isPostApprovalMode, // Default to true for post-approval fields
      description: field.description || '',
      options: field.options || [],
      validation: field.validation || {},
      aiEvaluation: {
        includeInEvaluation: field.aiEvaluation?.includeInEvaluation ?? true,
      },
    },
  });

  const watchedOptions = watch('options') || [];
  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);

  // Watch all form values and auto-update the field
  const watchedValues = watch();

  useEffect(() => {
    const subscription = watch((data) => {
      // Only update if data is valid (has required fields)
      if (data.label && data.label.trim().length > 0) {
        const updatedField: FormField = {
          ...field,
          label: data.label,
          placeholder: data.placeholder || '',
          required: data.required || false,
          private: data.private || isPostApprovalMode, // Always true for post-approval fields
          description: data.description || '',
          options: hasOptions ? (data.options || []).filter((opt): opt is string => typeof opt === 'string' && opt.length > 0) : undefined,
          validation: data.validation || {},
          aiEvaluation: data.aiEvaluation || {},
        };
        onUpdate(updatedField);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, onUpdate, field, hasOptions]);



  const updateOption = (index: number, value: string) => {
    const newOptions = [...watchedOptions];
    newOptions[index] = value;
    setValue('options', newOptions);
  };

  const addOption = () => {
    const newOptions = [...watchedOptions, ''];
    setValue('options', newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = watchedOptions.filter((_, i) => i !== index);
    setValue('options', newOptions);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Field Settings
        </h3>
        <div className="flex items-center space-x-2">
          {onMoveUp && (
            <button
              onClick={() => onMoveUp(field.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Move up"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={() => onMoveDown(field.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Move down"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(field.id)}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Delete field"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Field Label *
          </label>
          <input
            {...register('label')}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
            placeholder="Enter field label"
          />
          {errors.label && (
            <p className="text-red-500 text-sm mt-1">{errors.label.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Placeholder Text
          </label>
          <input
            {...register('placeholder')}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
            placeholder="Enter placeholder text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description (Help Text)
          </label>
          <MarkdownEditor
            value={field.description || ''}
            onChange={(value: string) => setValue('description', value)}
            placeholderText="Optional description or help text"
            height={200}
            minHeight={170}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
          />

        </div>

        <div className="space-y-3">
          <div className="flex items-center">
            <input
              {...register('required')}
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Required field
            </label>
          </div>

          {/* Private Field Toggle - Hidden in post-approval mode since all fields are automatically private */}
          {!isPostApprovalMode && (
            <div className="flex items-center">
              <input
                {...register('private')}
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Private field
              </label>
              <QuestionTooltip
                content="This field will be hidden from public application listings"
                className="ml-2"
              />
            </div>
          )}
        </div>

        {/* AI Evaluation Configuration - Hidden in post-approval mode */}
        {!isPostApprovalMode && (
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              AI Evaluation Settings
            </h4>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  {...register('aiEvaluation.includeInEvaluation')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Include this field in AI evaluation context
                </label>
              </div>


            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Real-time evaluation provides instant feedback to applicants as they complete the form.
            </p>
          </div>
        )}

        {hasOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {watchedOptions.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
                    placeholder={`Option ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="p-2 text-red-400 hover:text-red-600"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                onClick={addOption}
                variant="secondary"
                className="w-full"
              >
                Add Option
              </Button>
            </div>
          </div>
        )}

        {/* Milestone-specific validation */}
        {field.type === 'milestone' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Milestone Limits
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Minimum Milestones
                </label>
                <input
                  {...register('validation.minMilestones', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Maximum Milestones
                </label>
                <input
                  {...register('validation.maxMilestones', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="10"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Set limits for how many milestones users can add. Leave empty for no limits.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}