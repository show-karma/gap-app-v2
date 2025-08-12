'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormSchema } from '@/types/question-builder';
import { LockClosedIcon } from '@heroicons/react/24/solid';

const settingsConfigSchema = z.object({
  privateApplications: z.boolean(),
});

type SettingsConfigFormData = z.infer<typeof settingsConfigSchema>;

interface SettingsConfigurationProps {
  schema: FormSchema;
  onUpdate: (updatedSchema: FormSchema) => void;
  className?: string;
}

export function SettingsConfiguration({ 
  schema, 
  onUpdate, 
  className = '' 
}: SettingsConfigurationProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = useForm<SettingsConfigFormData>({
    resolver: zodResolver(settingsConfigSchema),
    defaultValues: {
      privateApplications: schema.settings?.privateApplications ?? true,
    },
  });

  // Watch for changes and auto-update
  useEffect(() => {
    const subscription = watch((data) => {
      const updatedSchema: FormSchema = {
        ...schema,
        settings: {
          ...schema.settings,
          submitButtonText: schema.settings?.submitButtonText || 'Submit Application',
          confirmationMessage: schema.settings?.confirmationMessage || 'Thank you for your submission!',
          privateApplications: data.privateApplications ?? true,
        },
      };
      
      // Debug logging to verify the data structure
      console.log('SettingsConfiguration - Updated Schema:', {
        privateApplications: updatedSchema.settings.privateApplications,
        fullSettings: updatedSchema.settings,
        formData: data
      });
      
      onUpdate(updatedSchema);
    });

    return () => subscription.unsubscribe();
  }, [watch, onUpdate, schema]);

  const privateApplicationsValue = watch('privateApplications');
  const privateFieldsCount = schema.fields?.filter(field => field.private).length || 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Privacy Settings */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <LockClosedIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Privacy Settings
          </h3>
        </div>

        <div className="space-y-6">
          {/* Private Applications Setting */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                {...register('privateApplications')}
                type="checkbox"
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Private Applications
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  When enabled, all application data will be hidden from public view. Only program administrators and applicants can see applications.
                </p>
              </div>
            </div>

            {/* Warning when private applications is disabled but has private fields */}
            {!privateApplicationsValue && privateFieldsCount > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Note:</strong> You have {privateFieldsCount} private field{privateFieldsCount !== 1 ? 's' : ''} in your form. 
                    These will be filtered from public responses even with public applications enabled.
                  </div>
                </div>
              </div>
            )}

            {/* Info when private applications is enabled */}
            {privateApplicationsValue && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>Private mode:</strong> Public API requests will return a privacy message instead of application data. 
                    Only authenticated administrators can access application details.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Privacy Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Privacy Summary
            </h4>
            <dl className="text-xs space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Application Visibility:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {privateApplicationsValue ? 'Private' : 'Public'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Private Fields:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {privateFieldsCount} field{privateFieldsCount !== 1 ? 's' : ''}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Public Fields:</dt>
                <dd className="text-gray-900 dark:text-white font-medium">
                  {(schema.fields?.length || 0) - privateFieldsCount} field{((schema.fields?.length || 0) - privateFieldsCount) !== 1 ? 's' : ''}
                </dd>
              </div>
            </dl>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <p className="mb-2"><strong>Private Applications:</strong> Hide all application data from public view</p>
            <p><strong>Private Fields:</strong> Individual fields marked as private are filtered from public responses (configure per field in the form builder)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
