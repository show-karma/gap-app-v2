'use client';

import { FC, useState } from 'react';
import ApplicationSubmissionWithAPI from './ApplicationSubmissionWithAPI';
import { Button } from '@/components/Utilities/Button';
import { ArrowLeftIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { cn } from '@/utilities/tailwind';

interface IResponsiveApplicationFormProps {
  programId: string;
  chainId: number;
  programTitle?: string;
  programDescription?: string;
  onSubmissionSuccess?: (applicationId: string) => void;
  onCancel?: () => void;
}

const ResponsiveApplicationForm: FC<IResponsiveApplicationFormProps> = ({
  programId,
  chainId,
  programTitle,
  programDescription,
  onSubmissionSuccess,
  onCancel,
}) => {
  const [showInstructions, setShowInstructions] = useState(true);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Back Button */}
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="secondary"
                className="flex items-center text-sm px-3 py-2 lg:hidden"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}

            {/* Title */}
            <div className="flex-1 mx-4 lg:mx-0">
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {programTitle || 'Grant Application'}
              </h1>
              {programDescription && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 hidden lg:block">
                  {programDescription}
                </p>
              )}
            </div>

            {/* Instructions Toggle */}
            <Button
              onClick={() => setShowInstructions(!showInstructions)}
              variant="secondary"
              className="flex items-center text-sm px-3 py-2"
            >
              <InformationCircleIcon className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Instructions</span>
            </Button>
          </div>

          {/* Mobile Program Description */}
          {programDescription && (
            <div className="mt-3 lg:hidden">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {programDescription}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions Panel */}
      {showInstructions && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 dark:text-blue-200 text-sm">
                  Application Guidelines
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p>• Fill out all required fields marked with an asterisk (*)</p>
                  <p>• Review your information carefully before submitting</p>
                  <p>• Your application will be automatically evaluated using AI</p>
                  <p>• You&apos;ll receive a confirmation email once submitted</p>
                </div>
              </div>
              <Button
                onClick={() => setShowInstructions(false)}
                variant="custom"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-1"
              >
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full">
        <div className="p-4 lg:p-8">
          {/* Form Container */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 lg:p-8">
              <ApplicationSubmissionWithAPI
                programId={programId}
                chainId={chainId}
                onSubmissionSuccess={onSubmissionSuccess}
                onCancel={onCancel}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="mb-2 sm:mb-0">
              <span>Secure application powered by GAP Protocol</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Need help?</span>
              <a 
                href="#" 
                className="text-brand-blue hover:text-brand-blue/80 underline"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveApplicationForm; 