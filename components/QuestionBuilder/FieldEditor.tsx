'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from '@/types/question-builder';
import { Button } from '@/components/Utilities/Button';
import { TrashIcon } from '@heroicons/react/24/solid';

const fieldSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  placeholder: z.string().optional(),
  required: z.boolean(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface FieldEditorProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: (fieldId: string) => void;
  onMoveUp?: (fieldId: string) => void;
  onMoveDown?: (fieldId: string) => void;
}

export function FieldEditor({ field, onUpdate, onDelete, onMoveUp, onMoveDown }: FieldEditorProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      label: field.label,
      placeholder: field.placeholder || '',
      required: field.required || false,
      description: field.description || '',
      options: field.options || [],
    },
  });

  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);
  const options = watch('options') || [];

  const onSubmit = (data: FieldFormData) => {
    onUpdate({
      ...field,
      ...data,
      options: hasOptions ? data.options?.filter(Boolean) : undefined,
    });
  };

  const addOption = () => {
    const newOptions = [...options, ''];
    setValue('options', newOptions);
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setValue('options', newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setValue('options', newOptions);
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
          {field.type.charAt(0).toUpperCase() + field.type.slice(1)} Field
        </h4>
        
        <div className="flex items-center space-x-2">
          {onMoveUp && (
            <button
              onClick={() => onMoveUp(field.id)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Move up"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={() => onMoveDown(field.id)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Move down"
            >
              ↓
            </button>
          )}
          <button
            onClick={() => onDelete(field.id)}
            className="p-1 text-red-400 hover:text-red-600"
            title="Delete field"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Placeholder Text
          </label>
          <input
            {...register('placeholder')}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
            placeholder="Enter placeholder text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            {...register('description')}
            rows={2}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-300"
            placeholder="Enter field description"
          />
        </div>

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

        {hasOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
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

        <Button type="submit" className="w-full">
          Update Field
        </Button>
      </form>
    </div>
  );
}