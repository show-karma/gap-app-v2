"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";

export interface EmptyEvaluationStateProps {
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Action button(s) to display */
  actions?: React.ReactNode;
}

export const EmptyEvaluationState: FC<EmptyEvaluationStateProps> = ({
  title = "No AI Evaluation Yet",
  description = "Run an AI evaluation to get automated feedback and analysis of this application.",
  actions,
}) => {
  return (
    <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-primary/10 rounded-full">
          <SparklesIcon className="w-8 h-8 text-primary" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
        {description}
      </p>
      {actions && <div className="flex items-center justify-center gap-3">{actions}</div>}
    </div>
  );
};

export default EmptyEvaluationState;
