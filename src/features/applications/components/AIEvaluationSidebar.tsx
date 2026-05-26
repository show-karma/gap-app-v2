"use client";

import { Info } from "lucide-react";
import { type AIEvaluationData, AIEvaluationDisplay } from "./AIEvaluationDisplay";

interface AIEvaluationSidebarProps {
  evaluation: AIEvaluationData | null;
  isEvaluating: boolean;
  evaluationError: string | null;
  programName?: string;
}

export function AIEvaluationSidebar({
  evaluation,
  isEvaluating,
  evaluationError,
  programName,
}: AIEvaluationSidebarProps) {
  return (
    <div className="lg:col-span-1">
      <div className="sticky top-6">
        <AIEvaluationDisplay
          evaluation={evaluation}
          isLoading={isEvaluating}
          isEnabled
          hasError={!!evaluationError}
          programName={programName}
        />
        {evaluationError && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">AI feedback did not finish</p>
                <p className="text-sm leading-6 text-muted-foreground">{evaluationError}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
