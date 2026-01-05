"use client";

import { type FC, useState } from "react";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";
import { AIEvaluationDisplay } from "../AIEvaluation";
import AIEvaluationButton from "../AIEvaluationButton";
import { InternalAIEvaluationDisplay } from "../InternalAIEvaluation";
import { type AIAnalysisSubTabId, AIAnalysisSubTabs } from "./AIAnalysisSubTabs";
import { EmptyEvaluationState } from "./EmptyEvaluationState";

export interface AIAnalysisTabProps {
  /** The funding application to display evaluations for */
  application: IFundingApplication;
  /** The program for context (optional) */
  program?: ProgramWithFormSchema;
  /** Callback when evaluation is completed (to refresh data) */
  onEvaluationComplete?: () => void;
  /** Whether to show the run evaluation button (default: true) */
  canRunEvaluation?: boolean;
}

function getDefaultTab(hasExternal: boolean, hasInternal: boolean): AIAnalysisSubTabId {
  return !hasExternal && hasInternal ? "internal" : "external";
}

/**
 * AI Analysis tab component that displays AI evaluations for a funding application.
 * Uses sub-tabs to switch between external (visible to applicants) and internal (reviewer-only) evaluations.
 */
export const AIAnalysisTab: FC<AIAnalysisTabProps> = ({
  application,
  program,
  onEvaluationComplete,
  canRunEvaluation = true,
}) => {
  const hasExternalEvaluation = Boolean(application.aiEvaluation?.evaluation);
  const hasInternalEvaluation = Boolean(application.internalAIEvaluation?.evaluation);

  // Determine initial tab based on which evaluations exist
  const [activeSubTab, setActiveSubTab] = useState<AIAnalysisSubTabId>(() =>
    getDefaultTab(hasExternalEvaluation, hasInternalEvaluation)
  );

  const referenceNumber = application.referenceNumber || application.id;

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between gap-4">
        <AIAnalysisSubTabs activeTab={activeSubTab} onTabChange={setActiveSubTab} />

        {/* Run button for current tab - only shown if user can run evaluations */}
        {canRunEvaluation && (
          <AIEvaluationButton
            referenceNumber={referenceNumber}
            onEvaluationComplete={onEvaluationComplete}
            isInternal={activeSubTab === "internal"}
          />
        )}
      </div>

      {/* Content based on active sub-tab */}
      {activeSubTab === "external" ? (
        hasExternalEvaluation ? (
          <AIEvaluationDisplay
            evaluation={application.aiEvaluation?.evaluation || null}
            isLoading={false}
            isEnabled={true}
            programName={program?.name}
          />
        ) : (
          <EmptyEvaluationState
            title="No External Evaluation Yet"
            description="Run an AI evaluation to get automated feedback visible to the applicant."
          />
        )
      ) : hasInternalEvaluation ? (
        <InternalAIEvaluationDisplay
          evaluation={application.internalAIEvaluation?.evaluation || null}
          programName={program?.name}
        />
      ) : (
        <EmptyEvaluationState
          title="No Internal Evaluation Yet"
          description="Run an internal AI evaluation for reviewer-only insights and analysis."
        />
      )}
    </div>
  );
};

export default AIAnalysisTab;
