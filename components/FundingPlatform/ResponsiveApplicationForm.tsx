'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { QuestionFormRenderer } from '@/components/QuestionBuilder/QuestionFormRenderer';
import { useProgramConfig } from '@/hooks/useFundingPlatform';
import { Spinner } from '@/components/Utilities/Spinner';
import { FormSchema } from '@/types/question-builder';

interface ResponsiveApplicationFormProps {
  programId: string;
  chainId: number;
  programTitle?: string;
  programDescription?: string;
  programInstructions?: string;
  onSubmissionSuccess: (applicationId: string) => void;
  onCancel: () => void;
  initialData?: any;
}

export function ResponsiveApplicationForm({
  programId,
  chainId,
  programTitle,
  programDescription,
  programInstructions,
  onSubmissionSuccess,
  onCancel,
  initialData
}: ResponsiveApplicationFormProps) {
  const [isInstructionsExpanded, setIsInstructionsExpanded] = useState(false);
  const [formData, setFormData] = useState(initialData || {});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    config,
    isLoading,
    error
  } = useProgramConfig(programId, chainId);

  const handleValueChanged = useCallback((data: any) => {
    setFormData(data);
  }, []);

  const handleSubmit = useCallback(async (data: any) => {
    setIsSubmitting(true);
    try {
      // Use the proper API service to submit application
      const { fundingApplicationsAPI } = await import('@/services/fundingPlatformService');
      const result = await fundingApplicationsAPI.submitApplication(programId, chainId, data);
      onSubmissionSuccess(result.id || result.referenceNumber || 'APP-' + Date.now());
    } catch (error) {
      console.error('Error submitting application:', error);
      // Handle error (show toast, etc.)
    } finally {
      setIsSubmitting(false);
    }
  }, [programId, chainId, onSubmissionSuccess]);

  const handleGoBack = useCallback(() => {
    if (onCancel) {
      onCancel();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback navigation
      window.location.href = '/';
    }
  }, [onCancel]);

  if (isLoading) {
    return (
      <div className="flex w-full items-center justify-center min-h-screen">
        <div className="text-center">
          <Spinner />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading application form...
          </p>
        </div>
      </div>
    );
  }

  if (error || !config?.formSchema) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Form Not Available
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Unable to load the application form. Please try again later.
          </p>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Always use React Hook Form renderer now

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleGoBack}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Go back"
                disabled={isSubmitting}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {programTitle || config.formSchema.title || 'Funding Application'}
                </h1>
                <p className="text-sm text-gray-600">Funding Application</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Auto-save indicator - removed as it's misleading without actual implementation */}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Program Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {programTitle || config.formSchema.title}
            </h2>
            {(programDescription || config.formSchema.description) && (
              <p className="text-gray-600 mb-4">
                {programDescription || config.formSchema.description}
              </p>
            )}

            {/* Instructions Section */}
            {programInstructions && (
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => setIsInstructionsExpanded(!isInstructionsExpanded)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <span className="text-sm font-medium text-gray-900">
                    Application Instructions
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isInstructionsExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isInstructionsExpanded && (
                  <div className="mt-3 text-sm text-gray-600 prose prose-sm max-w-none">
                    {programInstructions}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Application Form</h3>
              <p className="text-sm text-gray-600">
                Please fill out all required fields. Make sure to complete and submit your application in one session.
              </p>
            </div>

            <QuestionFormRenderer
              schema={config.formSchema as FormSchema}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />

            {isSubmitting && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <Spinner />
                  <span className="ml-2 text-blue-700">Submitting your application...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="text-blue-800 font-medium mb-1">Important Notes:</p>
              <ul className="text-blue-700 space-y-1">
                <li>• All fields marked with an asterisk (*) are required</li>
                <li>• Please complete your application in one session</li>
                <li>• Review your information carefully before submitting</li>
                <li>• Ensure all information is accurate before submitting</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <span>Need help?</span>
              <a href="/support" className="text-blue-600 hover:text-blue-800 font-medium">
                Contact Support
              </a>
              <span>•</span>
              <a href="/guidelines" className="text-blue-600 hover:text-blue-800 font-medium">
                Application Guidelines
              </a>
            </div>
            <div className="text-center sm:text-right">
              <p>Powered by React Hook Forms</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 