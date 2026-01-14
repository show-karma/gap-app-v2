"use client";

import { useState } from "react";
import { ReviewerManagementTab } from "@/components/FundingPlatform/QuestionBuilder/ReviewerManagementTab";
import { AIPromptConfiguration } from "@/components/QuestionBuilder/AIPromptConfiguration";
import type { FormSchema } from "@/types/question-builder";
import { cn } from "@/utilities/tailwind";

interface ReviewEvaluationSectionProps {
  programId: string;
  chainId?: number;
  communityId: string;
  schema: FormSchema;
  onSchemaUpdate: (schema: FormSchema) => void;
  readOnly?: boolean;
}

type SubSection = "reviewers" | "ai";

export function ReviewEvaluationSection({
  programId,
  chainId,
  communityId,
  schema,
  onSchemaUpdate,
  readOnly = false,
}: ReviewEvaluationSectionProps) {
  const [activeSubSection, setActiveSubSection] = useState<SubSection>("reviewers");

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubSection("reviewers")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
            activeSubSection === "reviewers"
              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          Reviewers
        </button>
        <button
          type="button"
          onClick={() => setActiveSubSection("ai")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors",
            activeSubSection === "ai"
              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          AI Scoring
        </button>
      </div>

      {/* Content */}
      {activeSubSection === "reviewers" ? (
        <div>
          {programId && communityId ? (
            <ReviewerManagementTab
              programId={programId}
              communityId={communityId}
              readOnly={readOnly}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                Program information is required to manage reviewers.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <AIPromptConfiguration
            onUpdate={readOnly ? undefined : onSchemaUpdate}
            schema={schema}
            programId={programId}
            chainId={chainId}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  );
}
