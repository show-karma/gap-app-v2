"use client";

import { FlaskConical, Loader2, Play, Save } from "lucide-react";
import { cn } from "@/utilities/tailwind";

interface PromptEditorActionsProps {
  isNewPrompt: boolean;
  canSave: boolean;
  canTest: boolean;
  canBulkEvaluate: boolean;
  isSaving: boolean;
  isBulkEvaluating: boolean;
  isJobRunning: boolean;
  onSave: () => void;
  onOpenTestPanel: () => void;
  onBulkEvaluate: () => void;
}

export function PromptEditorActions({
  isNewPrompt,
  canSave,
  canTest,
  canBulkEvaluate,
  isSaving,
  isBulkEvaluating,
  isJobRunning,
  onSave,
  onOpenTestPanel,
  onBulkEvaluate,
}: PromptEditorActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={onSave}
        disabled={!canSave || isSaving}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
          "bg-blue-600 text-white hover:bg-blue-700",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            {isNewPrompt ? "Create Prompt" : "Save Changes"}
          </>
        )}
      </button>

      {canTest && (
        <button
          type="button"
          onClick={onOpenTestPanel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <FlaskConical className="w-4 h-4" />
          Test Prompt
        </button>
      )}

      {canBulkEvaluate && (
        <button
          type="button"
          onClick={onBulkEvaluate}
          disabled={isBulkEvaluating || isJobRunning}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
            "text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600",
            "hover:bg-gray-50 dark:hover:bg-gray-700",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isBulkEvaluating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Evaluate All Applications
            </>
          )}
        </button>
      )}
    </div>
  );
}
