"use client";

import { CpuChipIcon } from "@heroicons/react/24/outline";
import { type FC, memo } from "react";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SimocracyEvaluationRow } from "@/services/fundingApplicationIntegrations.service";
import { AIEvaluationCard } from "../AIAnalysisTab/AIEvaluationCard";
import { MarginalValueCurve } from "./MarginalValueCurve";

export interface SimocracyEvaluationCardProps {
  evaluation: SimocracyEvaluationRow;
}

function simDisplayName(evaluation: SimocracyEvaluationRow): string {
  if (evaluation.sim.simName) return evaluation.sim.simName;
  const uri = evaluation.sim.simUri;
  return uri.length > 40 ? `…${uri.slice(-24)}` : uri;
}

const SimocracyEvaluationCardComponent: FC<SimocracyEvaluationCardProps> = ({ evaluation }) => {
  const icon = evaluation.sim.avatar ? (
    <ProfilePicture
      imageURL={evaluation.sim.avatar}
      name={simDisplayName(evaluation)}
      size="20"
      className="h-5 w-5"
      alt=""
    />
  ) : (
    <CpuChipIcon className="h-5 w-5" />
  );

  return (
    <AIEvaluationCard
      title={simDisplayName(evaluation)}
      subtitle={evaluation.model ?? "Model not recorded"}
      icon={icon}
    >
      <div className="space-y-4">
        {evaluation.prompt !== null && (
          <Accordion type="single" collapsible>
            <AccordionItem
              value="constitution"
              className="border border-gray-200 dark:border-gray-700 rounded-md px-3 border-b"
            >
              <AccordionTrigger className="text-gray-700 dark:text-gray-300 py-2.5">
                Constitution
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {evaluation.prompt}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">
          {evaluation.reasoning}
        </p>

        {evaluation.mvf.length > 0 && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              Marginal value curve
            </h4>
            <MarginalValueCurve points={evaluation.mvf} />
          </div>
        )}
      </div>
    </AIEvaluationCard>
  );
};

export const SimocracyEvaluationCard = memo(SimocracyEvaluationCardComponent);
