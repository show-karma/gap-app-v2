"use client";

import type { FC } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AIEvaluationDisplay } from "../ApplicationView/AIEvaluation";
import { InternalAIEvaluationDisplay } from "../ApplicationView/InternalAIEvaluation";

export type EvaluationType = "external" | "internal";

interface AIEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationType: EvaluationType;
  evaluation: string | null | undefined;
  projectTitle?: string;
}

export const AIEvaluationModal: FC<AIEvaluationModalProps> = ({
  isOpen,
  onClose,
  evaluationType,
  evaluation,
  projectTitle,
}) => {
  const title = evaluationType === "external" ? "AI Evaluation" : "Internal AI Evaluation";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {projectTitle && <DialogDescription>{projectTitle}</DialogDescription>}
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto">
          {evaluationType === "external" ? (
            <AIEvaluationDisplay
              evaluation={evaluation ?? null}
              isLoading={false}
              isEnabled={true}
            />
          ) : (
            <InternalAIEvaluationDisplay evaluation={evaluation ?? null} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
