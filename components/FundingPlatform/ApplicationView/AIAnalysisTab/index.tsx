"use client";

import { type FC, useState } from "react";
import type { IFundingApplication, ProgramWithFormSchema } from "@/types/funding-platform";
import { AIEvaluationDisplay } from "../AIEvaluation";
import AIEvaluationButton from "../AIEvaluationButton";
import { InternalAIEvaluationDisplay } from "../InternalAIEvaluation";
import { KarmaProfileEvaluationDisplay } from "../KarmaProfileEvaluation";
import { ReEvaluateInternalButton } from "../ReEvaluateInternalButton";
import { ReEvaluateKarmaProfileButton } from "../ReEvaluateKarmaProfileButton";
import { RunKarmaProfileButton } from "../RunKarmaProfileButton";
import { type AIAnalysisSubTabId, AIAnalysisSubTabs } from "./AIAnalysisSubTabs";
import { EmptyEvaluationState } from "./EmptyEvaluationState";

interface AIAnalysisTabProps {
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
  // Any non-undefined Insights record (including SKIPPED / FAILED) counts as
  // "has run" — routes to the Insights tab by default if it's the only one
  // with signal, AND surfaces the Re-evaluate button so admins can retry
  // failed/skipped states once the underlying issue is fixed (applicant linked
  // a project, program added the field, etc.).
  const hasInsightsRecord = Boolean(insightsRecord);

  const [activeSubTab, setActiveSubTab] = useState<AIAnalysisSubTabId>(() =>
    getDefaultTab(hasExternalEvaluation, hasInternalEvaluation, hasInsightsRecord)
  );

  const referenceNumber = application.referenceNumber || application.id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <AIAnalysisSubTabs activeTab={activeSubTab} onTabChange={setActiveSubTab} />
        <RunButton
          activeSubTab={activeSubTab}
          referenceNumber={referenceNumber}
          canRunEvaluation={canRunEvaluation}
          hasInternalEvaluation={hasInternalEvaluation}
          hasInsightsRecord={hasInsightsRecord}
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

interface RunButtonProps {
  activeSubTab: AIAnalysisSubTabId;
  referenceNumber: string;
  canRunEvaluation: boolean;
  hasInternalEvaluation: boolean;
  hasInsightsRecord: boolean;
  onEvaluationComplete?: () => void;
}

/**
 * Renders the right-side run/re-run button next to the sub-tab bar.
 * Extracted from `AIAnalysisTab` so React reconciles button identity
 * properly when the active sub-tab changes (avoids the render-in-render
 * anti-pattern).
 */
function RunButton({
  activeSubTab,
  referenceNumber,
  canRunEvaluation,
  hasInternalEvaluation,
  hasInsightsRecord,
  onEvaluationComplete,
}: RunButtonProps) {
  if (!canRunEvaluation) return null;

  if (activeSubTab === "internal" && hasInternalEvaluation) {
    return (
      <ReEvaluateInternalButton
        referenceNumber={referenceNumber}
        onEvaluationComplete={onEvaluationComplete}
      />
    );
  }

  if (activeSubTab === "insights" && hasInsightsRecord) {
    // Re-evaluate is available for any prior record (completed, failed,
    // or skipped). The dialog gates destructive overwrites of completed
    // evals; retrying failed/skipped is cheap.
    return (
      <ReEvaluateKarmaProfileButton
        referenceNumber={referenceNumber}
        onEvaluationComplete={onEvaluationComplete}
      />
    );
  }

  if (activeSubTab === "insights") {
    // No prior record at all — most commonly a pre-feature application
    // (no backfill) or an app whose auto-fire didn't run. Surface a
    // first-run "Run Insights" button (no confirmation dialog — nothing
    // to overwrite). Hits the same endpoint as Re-evaluate.
    return (
      <RunKarmaProfileButton
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
