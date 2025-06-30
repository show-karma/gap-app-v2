'use client';

import { FC, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { IFundingApplication } from '@/types/funding-platform';
import { Button } from '@/components/Utilities/Button';
import { cn } from '@/utilities/tailwind';
import { format, isValid, parseISO } from 'date-fns';

interface ApplicationDetailSidesheetProps {
  application: IFundingApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (applicationId: string, status: string, note?: string) => void;
  showStatusActions?: boolean;
}

const statusColors = {
  submitted: 'bg-blue-100 text-blue-800 border-blue-200',
  under_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

const statusIcons = {
  submitted: ClockIcon,
  under_review: ExclamationTriangleIcon,
  approved: CheckCircleIcon,
  rejected: XMarkIcon,
};

/**
 * Safely format a date string, handling invalid dates gracefully
 */
const formatDate = (dateString: string | Date | undefined | null, formatString: string = 'MMM dd, yyyy HH:mm'): string => {
  try {
    if (!dateString) return 'No date';
    
    let date: Date;
    if (typeof dateString === 'string') {
      date = parseISO(dateString);
      if (!isValid(date)) {
        date = new Date(dateString);
      }
    } else {
      date = dateString;
    }
    
    if (!isValid(date)) return 'Invalid date';
    return format(date, formatString);
  } catch (error) {
    return 'Invalid date';
  }
};

const ApplicationDetailSidesheet: FC<ApplicationDetailSidesheetProps> = ({
  application,
  isOpen,
  onClose,
  onStatusChange,
  showStatusActions = false,
}) => {
  if (!application) return null;

  const StatusIcon = statusIcons[application.status as keyof typeof statusIcons] || ClockIcon;

  const handleStatusChange = async (newStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(application.id, newStatus);
    }
  };

  const renderApplicationData = () => {
    if (!application.applicationData || Object.keys(application.applicationData).length === 0) {
      return <p className="text-gray-500">No application data available</p>;
    }

    return (
      <div className="space-y-4">
        {Object.entries(application.applicationData).map(([key, value]) => (
          <div key={key} className="border-b border-gray-100 pb-3">
            <dt className="text-sm font-medium text-gray-600 mb-1">
              {key.replace(/^field_\d+/, 'Field').replace(/_/g, ' ')}
            </dt>
            <dd className="text-sm text-gray-900">
              {Array.isArray(value) ? (
                <div className="flex flex-wrap gap-1">
                  {value.map((item, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs"
                    >
                      {String(item)}
                    </span>
                  ))}
                </div>
              ) : (
                <span>{String(value)}</span>
              )}
            </dd>
          </div>
        ))}
      </div>
    );
  };

  const renderAIEvaluation = () => {
    if (!application.aiEvaluation) {
      return (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <ClockIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">AI evaluation pending</p>
          <p className="text-gray-400 text-xs mt-1">
            The application will be automatically evaluated by AI shortly after submission.
          </p>
        </div>
      );
    }

    // Handle dual evaluation format
    const hasSystemEvaluation = application.aiEvaluation.systemEvaluation;
    const hasDetailedEvaluation = application.aiEvaluation.detailedEvaluation;

    const getRatingColor = (rating: number) => {
      if (rating >= 8) return 'text-green-600 bg-green-50 border-green-200';
      if (rating >= 6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      return 'text-red-600 bg-red-50 border-red-200';
    };

    const renderEvaluationCard = (evaluation: any, title: string, description: string) => {
      const { rating, reasoning, strengths, weaknesses, recommendations } = evaluation;
      
      return (
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
            <div className={cn('px-3 py-1 rounded-lg border text-sm font-medium', getRatingColor(rating))}>
              {rating}/10
            </div>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>

          {reasoning && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Summary</h5>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded p-2">
                {reasoning}
              </p>
            </div>
          )}

          {strengths && strengths.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Strengths</h5>
              <ul className="space-y-1">
                {strengths.map((strength: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {weaknesses && weaknesses.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Areas for Improvement</h5>
              <ul className="space-y-1">
                {weaknesses.map((weakness: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations && recommendations.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Recommendations</h5>
              <ul className="space-y-1">
                {recommendations.map((recommendation: string, index: number) => (
                  <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                    <span className="text-blue-500 mr-2">→</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {hasSystemEvaluation && renderEvaluationCard(
          application.aiEvaluation.systemEvaluation,
          'System Prompt Evaluation',
          'Core evaluation based on program criteria'
        )}
        
        {hasDetailedEvaluation && renderEvaluationCard(
          application.aiEvaluation.detailedEvaluation,
          'Detailed Evaluation',
          'Comprehensive evaluation with additional criteria'
        )}
        
        {hasSystemEvaluation && hasDetailedEvaluation && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Evaluation Summary
            </h5>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              System Score: {application.aiEvaluation.systemEvaluation?.rating}/10 | 
              Detailed Score: {application.aiEvaluation.detailedEvaluation?.rating}/10
            </p>
          </div>
        )}
        
        {!hasSystemEvaluation && !hasDetailedEvaluation && (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <ClockIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No AI evaluation available</p>
            <p className="text-gray-400 text-xs mt-1">
              The application may not have been evaluated yet or evaluation data is missing.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto relative w-screen max-w-2xl">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-in-out duration-500"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in-out duration-500"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="absolute left-0 top-0 -ml-8 flex pr-2 pt-4 sm:-ml-10 sm:pr-4">
                      <button
                        type="button"
                        className="relative rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                        onClick={onClose}
                      >
                        <span className="absolute -inset-2.5" />
                        <span className="sr-only">Close panel</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                  </Transition.Child>
                  
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    {/* Header */}
                    <div className="bg-gray-50 px-4 py-6 sm:px-6">
                      <div className="flex items-start justify-between space-x-3">
                        <div className="space-y-1">
                          <Dialog.Title className="text-base font-semibold leading-6 text-gray-900">
                            Application Details
                          </Dialog.Title>
                          <p className="text-sm text-gray-500">
                            {application.referenceNumber}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className={cn(
                            'flex items-center space-x-2 px-3 py-1 rounded-full border text-sm font-medium',
                            statusColors[application.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200'
                          )}>
                            <StatusIcon className="w-4 h-4" />
                            <span>{application.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-4 py-6 sm:px-6">
                      <div className="space-y-8">
                        {/* Basic Information */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                          <dl className="space-y-3">
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Applicant Email</dt>
                              <dd className="mt-1 text-sm text-gray-900">{application.applicantAddress}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Submitted</dt>
                              <dd className="mt-1 text-sm text-gray-900">{formatDate(application.submittedAt)}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Reference Number</dt>
                              <dd className="mt-1 text-sm text-gray-900 font-mono">{application.referenceNumber}</dd>
                            </div>
                          </dl>
                        </div>

                        {/* Application Data */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Application Details</h3>
                          {renderApplicationData()}
                        </div>

                        {/* AI Evaluation */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">AI Evaluation</h3>
                          {renderAIEvaluation()}
                        </div>

                        {/* Status History */}
                        {application.statusHistory && application.statusHistory.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Status History</h3>
                            <div className="space-y-2">
                              {application.statusHistory.map((history, index) => (
                                <div key={index} className="flex items-center space-x-3 text-sm">
                                  <span className="text-gray-500">{formatDate(history.timestamp)}</span>
                                  <span className="text-gray-700">{history.status}</span>
                                  {history.note && (
                                    <span className="text-gray-500">- {history.note}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {showStatusActions && onStatusChange && (
                      <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
                        <div className="flex space-x-3">
                          {application.status === 'submitted' && (
                            <>
                              <Button
                                onClick={() => handleStatusChange('under_review')}
                                variant="secondary"
                                className="flex-1"
                              >
                                Move to Review
                              </Button>
                              <Button
                                onClick={() => handleStatusChange('approved')}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleStatusChange('rejected')}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {application.status === 'under_review' && (
                            <>
                              <Button
                                onClick={() => handleStatusChange('approved')}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleStatusChange('rejected')}
                                className="flex-1 bg-red-600 hover:bg-red-700"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ApplicationDetailSidesheet; 