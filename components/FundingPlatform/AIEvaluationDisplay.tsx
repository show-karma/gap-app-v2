'use client';

import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { Spinner } from '@/components/Utilities/Spinner';

export interface AIEvaluationData {
  rating: number;
  feedback: string;
  suggestions: string[];
  isComplete: boolean;
  evaluatedAt: string;
  model: string;
}

interface AIEvaluationDisplayProps {
  evaluation: AIEvaluationData | null;
  isLoading: boolean;
  isEnabled: boolean;
  className?: string;
}

export function AIEvaluationDisplay({ 
  evaluation, 
  isLoading, 
  isEnabled,
  className = '' 
}: AIEvaluationDisplayProps) {
  if (!isEnabled) {
    return null;
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (rating >= 6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (rating >= 4) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getRatingIcon = (rating: number) => {
    if (rating >= 8) return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    if (rating >= 4) return <InformationCircleIcon className="w-5 h-5 text-blue-600" />;
    return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />;
  };

  const getRatingLabel = (rating: number) => {
    if (rating >= 8) return 'Excellent';
    if (rating >= 6) return 'Good';
    if (rating >= 4) return 'Needs Work';
    return 'Incomplete';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            AI Evaluation Feedback
          </h3>
          {isLoading && <Spinner className="w-4 h-4" />}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Real-time feedback to help improve your application
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Spinner className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Analyzing your application...
              </p>
            </div>
          </div>
        ) : evaluation ? (
          <div className="space-y-4">
            {/* Rating */}
            <div className={`flex items-center justify-between p-3 rounded-lg border ${getRatingColor(evaluation.rating)}`}>
              <div className="flex items-center space-x-2">
                {getRatingIcon(evaluation.rating)}
                <div>
                  <div className="font-medium">
                    {getRatingLabel(evaluation.rating)}
                  </div>
                  <div className="text-sm opacity-75">
                    Score: {evaluation.rating}/10
                  </div>
                </div>
              </div>
              {evaluation.isComplete && (
                <div className="flex items-center space-x-1 text-green-600">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">Ready to Submit</span>
                </div>
              )}
            </div>

            {/* Feedback */}
            {evaluation.feedback && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Current Progress
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  {evaluation.feedback}
                </p>
              </div>
            )}

            {/* Suggestions */}
            {evaluation.suggestions && evaluation.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Suggestions for Improvement
                </h4>
                <ul className="space-y-2">
                  {evaluation.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last evaluated: {new Date(evaluation.evaluatedAt).toLocaleString()} • Model: {evaluation.model}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <InformationCircleIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Start filling out your application to receive AI feedback
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 