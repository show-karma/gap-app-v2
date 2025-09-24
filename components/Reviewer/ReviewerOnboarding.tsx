"use client";

import React, { useState } from "react";
import { Button } from "@/components/Utilities/Button";
import {
  BookOpenIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentMagnifyingGlassIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XMarkIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/utilities/tailwind";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

interface ReviewerOnboardingProps {
  onComplete?: () => void;
  onDismiss?: () => void;
  programName?: string;
  className?: string;
}

/**
 * Onboarding component for first-time reviewers
 * Explains reviewer capabilities, limitations, and best practices
 */
export const ReviewerOnboarding: React.FC<ReviewerOnboardingProps> = ({
  onComplete,
  onDismiss,
  programName,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showQuickGuide, setShowQuickGuide] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome as a Reviewer",
      description: "Your role in the grant review process",
      icon: ShieldCheckIcon,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            {programName ? (
              <>You&apos;ve been assigned as a reviewer for <strong>{programName}</strong>.</>
            ) : (
              <>You&apos;ve been assigned as a reviewer for this funding program.</>
            )}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            As a reviewer, you play a crucial role in evaluating grant applications
            and providing valuable feedback to help make funding decisions.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Your Impact
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Your reviews help ensure fair and thorough evaluation of applications,
              contributing to the success of the grant program and its recipients.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "capabilities",
      title: "What You Can Do",
      description: "Your reviewer permissions and capabilities",
      icon: DocumentMagnifyingGlassIcon,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            As a reviewer, you have the following capabilities:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong className="text-gray-900 dark:text-gray-100">View Applications</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Access all submitted applications for programs you&apos;re assigned to review
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Add Comments</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Provide feedback and comments on applications to guide funding decisions
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Review Scores</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Rate applications based on evaluation criteria
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Track Progress</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Monitor your review progress and pending applications
                </p>
              </div>
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "limitations",
      title: "Important Limitations",
      description: "What reviewers cannot do",
      icon: InformationCircleIcon,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Please note the following limitations of the reviewer role:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <XMarkIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Cannot Edit Applications</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  You can only view and comment, not modify application content
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <XMarkIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Cannot Make Final Decisions</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Final funding decisions are made by program administrators
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <XMarkIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Cannot Manage Program Settings</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Program configuration and settings are restricted to admins
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <XMarkIcon className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Cannot Add Other Reviewers</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Only administrators can assign reviewer roles
                </p>
              </div>
            </li>
          </ul>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> If you need additional permissions or have questions
              about your role, please contact the program administrator.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "best-practices",
      title: "Best Practices",
      description: "Tips for effective reviewing",
      icon: BookOpenIcon,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Follow these best practices for effective and fair reviews:
          </p>
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Be Objective</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Evaluate applications based on merit and criteria, not personal preferences
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Provide Constructive Feedback</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Offer specific, actionable feedback that helps applicants improve
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Be Timely</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Complete reviews within the specified timeframe to keep the process moving
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Maintain Confidentiality</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Keep application details and review discussions confidential
              </p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Declare Conflicts</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Disclose any conflicts of interest with applicants or projects
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "communication",
      title: "Communication Guidelines",
      description: "How to communicate effectively",
      icon: ChatBubbleBottomCenterTextIcon,
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Effective communication is key to the review process:
          </p>
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                When Commenting on Applications
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Be professional and respectful
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Focus on strengths and areas for improvement
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Reference specific evaluation criteria
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Avoid personal opinions unrelated to criteria
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                Collaborating with Other Reviewers
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Respect different perspectives and expertise
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Share insights that may help others
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Ask questions when you need clarification
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  Participate in review discussions when scheduled
                </li>
              </ul>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Remember:</strong> Your comments may be shared with applicants
              as feedback, so ensure they are constructive and professional.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    const currentStepId = steps[currentStep].id;
    setCompletedSteps(prev => new Set(prev).add(currentStepId));

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-900 rounded-lg shadow-lg",
        className
      )}
      role="dialog"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CurrentIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />
            <div>
              <h2 id="onboarding-title" className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {steps[currentStep].title}
              </h2>
              <p id="onboarding-description" className="text-sm text-gray-500 dark:text-gray-400">
                {steps[currentStep].description}
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              aria-label="Close onboarding"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Step {currentStep + 1} of {steps.length}
          </span>
          <button
            onClick={() => setShowQuickGuide(!showQuickGuide)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {showQuickGuide ? "Hide" : "Show"} Quick Guide
          </button>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            role="progressbar"
            aria-valuenow={currentStep + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
          />
        </div>
        {showQuickGuide && (
          <div className="mt-3 flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "text-xs px-2 py-1 rounded-full transition-colors",
                  index === currentStep
                    ? "bg-blue-500 text-white"
                    : completedSteps.has(step.id)
                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                )}
              >
                {index + 1}. {step.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
        {steps[currentStep].content}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Skip tutorial
          </button>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button
              variant="primary"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact version of the onboarding for returning users
 */
export const ReviewerQuickReminder: React.FC<{
  onDismiss: () => void;
}> = ({ onDismiss }) => {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Quick Reminder: Your Reviewer Capabilities
          </h3>
          <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            <ul className="space-y-1">
              <li>• View and comment on applications</li>
              <li>• Provide scores and feedback</li>
              <li>• Cannot edit applications or make final decisions</li>
            </ul>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="ml-3 text-blue-400 hover:text-blue-500"
          aria-label="Dismiss reminder"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};