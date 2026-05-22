"use client";

import { type FC, useState } from "react";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";
import { AIEvaluationDisplay } from "../AIEvaluation";
import AIEvaluationButton from "../AIEvaluationButton";
import { InternalAIEvaluationDisplay } from "../InternalAIEvaluation";
import { KarmaProfileEvaluationDisplay } from "../KarmaProfileEvaluation";
import { ReEvaluateInternalButton } from "../ReEvaluateInternalButton";
import { ReEvaluateKarmaProfileButton } from "../ReEvaluateKarmaProfileButton";
import { type AIAnalysisSubTabId, AIAnalysisSubTabs } from "./AIAnalysisSubTabs";
import { EmptyEvaluationState } from "./EmptyEvaluationState";

export interface AIAnalysisTabProps {
  application: IFundingApplication;
  program?: ProgramWithFormSchema;
  onEvaluationComplete?: () => void;
  canRunEvaluation?: boolean;
}

function getDefaultTab(
  hasExternal: boolean,
  hasInternal: boolean,
  hasInsights: boolean
): AIAnalysisSubTabId {
  if (hasExternal) return "external";
  if (hasInternal) return "internal";
  if (hasInsights) return "insights";
  return "external";
}

/**
 * AI Analysis tab. Three sub-tabs:
 * - External: applicant-visible
 * - Internal: reviewer-only proposal critique
 * - Applications Insights: reviewer-only track-record verdict on the linked
 *   Karma project (independent of Internal — see karma-profile-insights-tab.md)
 */
export const AIAnalysisTab: FC<AIAnalysisTabProps> = ({
  application,
  program,
  onEvaluationComplete,
  canRunEvaluation = true,
}) => {
  const hasExternalEvaluation = Boolean(application.aiEvaluation?.evaluation);
  const hasInternalEvaluation = Boolean(application.internalAIEvaluation?.evaluation);
  const insightsRecord = application.karmaProfileEvaluation;
  // Any non-undefined Insights record (including SKIPPED) counts as "has run"
  // so we route to the Insights tab by default if it's the only one with
  // signal — keeps the UI from looking empty when reviewers click into apps
  // that only have a track-record verdict.
  const hasInsightsRecord = Boolean(insightsRecord);
  const hasInsightsEvaluation = Boolean(insightsRecord?.evaluation);

  const [activeSubTab, setActiveSubTab] = useState<AIAnalysisSubTabId>(() =>
    getDefaultTab(hasExternalEvaluation, hasInternalEvaluation, hasInsightsRecord)
  );

  const referenceNumber = application.referenceNumber || application.id;

  const renderRunButton = () => {
    if (!canRunEvaluation) return null;

    if (activeSubTab === "internal" && hasInternalEvaluation) {
      return (
        <ReEvaluateInternalButton
          referenceNumber={referenceNumber}
          onEvaluationComplete={onEvaluationComplete}
        />
      );
    }

    if (activeSubTab === "insights" && hasInsightsEvaluation) {
      return (
        <ReEvaluateKarmaProfileButton
          referenceNumber={referenceNumber}
          onEvaluationComplete={onEvaluationComplete}
        />
      );
    }

    // For first-time runs (external, internal without prior eval, or
    // insights without a completed prior). The Insights button uses
    // isInternal=false because the AIEvaluationButton's "isInternal" flag
    // only routes between External and Internal endpoints — Insights has
    // its own endpoint, which is reached via the dedicated re-evaluate
    // button. For now we hide the run button on Insights until an eval
    // exists; admins trigger via the resubmit flow or wait for auto-fire.
    if (activeSubTab === "insights") {
      return null;
    }

    return (
      <AIEvaluationButton
        referenceNumber={referenceNumber}
        onEvaluationComplete={onEvaluationComplete}
        isInternal={activeSubTab === "internal"}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <AIAnalysisSubTabs activeTab={activeSubTab} onTabChange={setActiveSubTab} />
        {renderRunButton()}
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
            context={application.internalAIEvaluation?.context || null}
            programName={program?.name}
          />
        ) : (
          <EmptyEvaluationState
            title="No Internal Evaluation Yet"
            description="Run an internal AI evaluation for reviewer-only insights and analysis."
          />
        ))}

      {activeSubTab === "insights" && (
        <KarmaProfileEvaluationDisplay
          evaluation={insightsRecord?.evaluation || null}
          context={insightsRecord?.context || null}
          status={insightsRecord?.status}
          evaluatedAt={insightsRecord?.evaluatedAt}
          skipReason={insightsRecord?.skipReason}
          programName={program?.name}
        />
      )}
    </div>
  );
};

export default AIAnalysisTab;
