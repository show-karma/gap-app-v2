"use client";

import { type FC, useState } from "react";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";
import { AIEvaluationDisplay } from "../AIEvaluation";
import AIEvaluationButton from "../AIEvaluationButton";
import { ApplicationInsightsPanel } from "../ApplicationInsights/ApplicationInsightsPanel";
import { InternalAIEvaluationDisplay } from "../InternalAIEvaluation";
import { ReEvaluateInternalButton } from "../ReEvaluateInternalButton";
import { type AIAnalysisSubTabId, AIAnalysisSubTabs } from "./AIAnalysisSubTabs";
import { EmptyEvaluationState } from "./EmptyEvaluationState";

export interface AIAnalysisTabProps {
  application: IFundingApplication;
  program?: ProgramWithFormSchema;
  onEvaluationComplete?: () => void;
  canRunEvaluation?: boolean;
  hasExternalPrompt?: boolean;
  hasInternalPrompt?: boolean;
  onOpenSimocracyTab?: () => void;
}

function getDefaultTab(
  hasExternal: boolean,
  hasInternal: boolean,
  visibleTabs: AIAnalysisSubTabId[]
): AIAnalysisSubTabId {
  if (hasExternal) return "external";
  if (hasInternal) return "internal";
  return visibleTabs[0];
}

/**
 * AI Analysis tab. External (applicant-visible) and Internal (reviewer-only)
 * evaluations sit beside Applicant Insights, the linked project's track
 * record. When neither evaluation applies, Insights renders without a sub-tab bar.
 */
export const AIAnalysisTab: FC<AIAnalysisTabProps> = ({
  application,
  program,
  onEvaluationComplete,
  canRunEvaluation = true,
  hasExternalPrompt = true,
  hasInternalPrompt = true,
  onOpenSimocracyTab,
}) => {
  const hasExternalEvaluation = Boolean(application.aiEvaluation?.evaluation);
  const hasInternalEvaluation = Boolean(application.internalAIEvaluation?.evaluation);
  const referenceNumber = application.referenceNumber || application.id;

  const visibleSubTabs: AIAnalysisSubTabId[] = [
    ...(hasExternalPrompt || hasExternalEvaluation ? (["external"] as const) : []),
    ...(hasInternalPrompt || hasInternalEvaluation ? (["internal"] as const) : []),
    "insights",
  ];

  const [selectedSubTab, setActiveSubTab] = useState<AIAnalysisSubTabId | null>(null);

  const insightsPanel = (
    <ApplicationInsightsPanel
      referenceNumber={referenceNumber}
      onOpenSimocracyTab={onOpenSimocracyTab}
    />
  );

  if (visibleSubTabs.length === 1) return insightsPanel;

  const activeSubTab =
    selectedSubTab && visibleSubTabs.includes(selectedSubTab)
      ? selectedSubTab
      : getDefaultTab(hasExternalEvaluation, hasInternalEvaluation, visibleSubTabs);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <AIAnalysisSubTabs
          activeTab={activeSubTab}
          onTabChange={setActiveSubTab}
          visibleTabs={visibleSubTabs}
        />
        <RunButton
          activeSubTab={activeSubTab}
          referenceNumber={referenceNumber}
          canRunEvaluation={canRunEvaluation}
          hasInternalEvaluation={hasInternalEvaluation}
          onEvaluationComplete={onEvaluationComplete}
        />
      </div>

      {activeSubTab === "external" &&
        (hasExternalEvaluation ? (
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
        ))}

      {activeSubTab === "internal" &&
        (hasInternalEvaluation ? (
          <InternalAIEvaluationDisplay
            evaluation={application.internalAIEvaluation?.evaluation || null}
            programName={program?.name}
          />
        ) : (
          <EmptyEvaluationState
            title="No Internal Evaluation Yet"
            description="Run an internal AI evaluation for reviewer-only insights and analysis."
          />
        ))}

      {activeSubTab === "insights" && insightsPanel}
    </div>
  );
};

interface RunButtonProps {
  activeSubTab: AIAnalysisSubTabId;
  referenceNumber: string;
  canRunEvaluation: boolean;
  hasInternalEvaluation: boolean;
  onEvaluationComplete?: () => void;
}

function RunButton({
  activeSubTab,
  referenceNumber,
  canRunEvaluation,
  hasInternalEvaluation,
  onEvaluationComplete,
}: RunButtonProps) {
  if (!canRunEvaluation || activeSubTab === "insights") return null;

  if (activeSubTab === "internal" && hasInternalEvaluation) {
    return (
      <ReEvaluateInternalButton
        referenceNumber={referenceNumber}
        onEvaluationComplete={onEvaluationComplete}
      />
    );
  }

  return (
    <AIEvaluationButton
      referenceNumber={referenceNumber}
      onEvaluationComplete={onEvaluationComplete}
      isInternal={activeSubTab === "internal"}
    />
  );
}

export default AIAnalysisTab;
